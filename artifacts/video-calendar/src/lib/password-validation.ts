export const PASSWORD_RULES = [
  { id: "length",    label: "Mínimo 8 caracteres",        test: (p: string) => p.length >= 8 },
  { id: "upper",     label: "1 letra maiúscula",           test: (p: string) => /[A-Z]/.test(p) },
  { id: "number",    label: "1 número",                    test: (p: string) => /[0-9]/.test(p) },
  { id: "special",   label: "1 caractere especial (!@#…)", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export function validatePassword(password: string): string | null {
  for (const rule of PASSWORD_RULES) {
    if (!rule.test(password)) return `Senha inválida: ${rule.label.toLowerCase()}`;
  }
  return null;
}

export function isPasswordValid(password: string): boolean {
  return PASSWORD_RULES.every((r) => r.test(password));
}
