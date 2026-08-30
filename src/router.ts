export type Route =
  | { page: 'landing' }
  | { page: 'programs' }
  | { page: 'program'; id: bigint }
  | { page: 'submission'; id: bigint }
  | { page: 'create' }
  | { page: 'submit'; bountyId: bigint | null }
  | { page: 'inbox'; id?: bigint }
  | { page: 'profile' }
  | { page: 'login' }
  | { page: 'login-org' }
  | { page: 'orgs' }
  | { page: 'dashboard' }
  | { page: 'edit'; id: bigint };

export const parseHash = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [seg, arg] = h.split('/');
  switch (seg) {
    case '':
    case 'landing':
    case 'home':
      return { page: 'landing' };
    case 'programs':
      return { page: 'programs' };
    case 'program':
      return arg ? { page: 'program', id: BigInt(arg) } : { page: 'programs' };
    case 'submission':
      return arg ? { page: 'submission', id: BigInt(arg) } : { page: 'dashboard' };
    case 'create':
      return { page: 'create' };
    case 'submit':
      return { page: 'submit', bountyId: arg ? BigInt(arg) : null };
    case 'inbox':
      return { page: 'inbox', ...(arg ? { id: BigInt(arg) } : {}) };
    case 'profile':
      return { page: 'profile' };
    case 'login':
      return { page: 'login' };
    case 'login-org':
      return { page: 'login-org' };
    case 'orgs':
      return { page: 'orgs' };
    case 'dashboard':
      return { page: 'dashboard' };
    case 'edit':
      return arg ? { page: 'edit', id: BigInt(arg) } : { page: 'dashboard' };
    default:
      return { page: 'landing' };
  }
};

export const navigate = (to: string): void => {
  window.location.hash = to;
};
