declare module 'libsodium-wrappers-sumo' {
  type KeyPair = { publicKey: Uint8Array; privateKey: Uint8Array };

  const sodium: {
    ready: Promise<void>;
    randombytes_buf(length: number): Uint8Array;
    crypto_generichash(length: number, input: Uint8Array): Uint8Array;
    crypto_box_keypair(): KeyPair;
    crypto_box_seed_keypair(seed: Uint8Array): KeyPair;
    crypto_box_seal(message: Uint8Array, publicKey: Uint8Array): Uint8Array;
    crypto_box_seal_open(ciphertext: Uint8Array, publicKey: Uint8Array, privateKey: Uint8Array): Uint8Array;
    to_base64(value: Uint8Array): string;
    from_base64(value: string): Uint8Array;
  };

  export default sodium;
}
