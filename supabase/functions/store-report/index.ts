import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const INDEXER_URL = Deno.env.get('ANONITY_INDEXER_URL') ?? 'https://indexer.preprod.midnight.network/api/v4/graphql';
const CONTRACT_ADDRESS = Deno.env.get('ANONITY_CONTRACT_ADDRESS') ?? '';

const VERIFY_QUERY = `
  query VerifySubmitReport($address: HexEncoded!, $offset: ContractActionOffset) {
    contractAction(address: $address, offset: $offset) {
      __typename
      ... on ContractCall {
        entryPoint
        transaction { hash }
      }
    }
  }
`;

const response = (body: Record<string, unknown>, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isPositiveSafeInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value > 0;

const isCiphertext = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 250_000;

const verifySubmitReportTransaction = async (txId: string): Promise<boolean> => {
  // The connector may expose either the transaction hash or its identifier.
  // Try both GraphQL offset variants; no report plaintext is sent to the indexer.
  for (const key of ['identifier', 'hash'] as const) {
    try {
      const result = await fetch(INDEXER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: VERIFY_QUERY,
          variables: {
            address: CONTRACT_ADDRESS,
            offset: { transactionOffset: { [key]: txId } },
          },
        }),
      });
      const payload = await result.json() as {
        data?: { contractAction?: { __typename?: string; entryPoint?: string; transaction?: { hash?: string } } | null };
        errors?: unknown[];
      };
      const action = payload.data?.contractAction;
      if (!payload.errors?.length && action?.__typename === 'ContractCall' && action.entryPoint === 'submitReport') {
        return true;
      }
    } catch {
      // Try the other transaction offset form before rejecting the request.
    }
  }
  return false;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return response({ error: 'method not allowed' }, 405);
  if (!CONTRACT_ADDRESS) return response({ error: 'chain gate is not configured' }, 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return response({ error: 'invalid JSON' }, 400);
  }

  const submissionId = body.submission_id;
  const bountyId = body.bounty_id;
  const txId = body.tx_id;
  if (!isPositiveSafeInteger(submissionId) || !isPositiveSafeInteger(bountyId) || typeof txId !== 'string' || txId.length > 200 || !isCiphertext(body.org_ciphertext) || !isCiphertext(body.hunter_ciphertext) || !isCiphertext(body.hunter_encryption_public_key) || body.encryption_version !== 1) {
    return response({ error: 'invalid encrypted report envelope' }, 400);
  }

  if (!await verifySubmitReportTransaction(txId)) {
    return response({ error: 'no finalized submitReport transaction found' }, 422);
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const { error } = await admin.from('reports').insert({
    submission_id: submissionId,
    bounty_id: bountyId,
    org_ciphertext: body.org_ciphertext,
    hunter_ciphertext: body.hunter_ciphertext,
    hunter_encryption_public_key: body.hunter_encryption_public_key,
    encryption_version: 1,
  });
  if (error) return response({ error: 'encrypted report could not be stored' }, error.code === '23505' ? 409 : 500);
  return response({ stored: true });
});
