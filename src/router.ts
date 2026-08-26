export type Route =
  | { page: 'programs' }
  | { page: 'program'; id: bigint }
  | { page: 'create' }
  | { page: 'submit'; bountyId: bigint | null }
  | { page: 'inbox' }
  | { page: 'profile' }
  | { page: 'access' };

export const parseHash = (): Route => {
  const h = window.location.hash.replace(/^#\/?/, '');
  const [seg, arg] = h.split('/');
  switch (seg) {
    case 'program':
      return arg ? { page: 'program', id: BigInt(arg) } : { page: 'programs' };
    case 'create':
      return { page: 'create' };
    case 'submit':
      return { page: 'submit', bountyId: arg ? BigInt(arg) : null };
    case 'inbox':
      return { page: 'inbox' };
    case 'profile':
      return { page: 'profile' };
    case 'access':
      return { page: 'access' };
    default:
      return { page: 'programs' };
  }
};

export const navigate = (to: string): void => {
  window.location.hash = to;
};
