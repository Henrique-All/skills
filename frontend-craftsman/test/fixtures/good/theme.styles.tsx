// FIXTURE BOA (tema duplo) — nenhuma regra pode disparar.
import styled, { css } from 'styled-components';
import { isLight } from '../theme';

// Texto do tema sobre superfície do tema
export const Toast = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  color: ${({ theme }) => theme.colors.text};
`;

// Branco sobre cor de marca sólida (legítimo)
export const PrimaryButton = styled.button`
  background: ${({ theme }) => theme.colors.primary};
  color: #ffffff;
  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
  }
`;

// Branco sobre fundo escuro fixo opaco (legítimo)
export const DarkBadge = styled.span`
  background: #0f766e;
  color: #ffffff;
`;

// Ternária com contraste bom nos dois temas
export const Muted = styled.p`
  background: ${({ theme }) => (isLight(theme) ? '#ffffff' : '#16161a')};
  color: ${({ theme }) => (isLight(theme) ? '#475569' : '#cbd5e1')};
`;

// Superfície/borda por tema
export const Card = styled.div`
  background: ${({ theme }) => (isLight(theme) ? '#ffffff' : 'rgba(255, 255, 255, 0.04)')};
  border: 1px solid ${({ theme }) => (isLight(theme) ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)')};
`;

// css`` que só vale no tema escuro pode usar branco translúcido
export const Row = styled.div`
  ${({ theme }) =>
    !isLight(theme) &&
    css`
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    `}
`;

// outline removido mas com foco visível
export const Field = styled.input`
  outline: none;
  color: ${({ theme }) => theme.colors.text};
  &:focus-visible {
    box-shadow: 0 0 0 2px ${({ theme }) => theme.colors.primary};
  }
`;

// Supressão consciente
export const CodeBlock = styled.pre`
  /* audit-ignore HARDCODED_DARK_SURFACE: bloco de código é escuro nos dois temas */
  background: #0b0b0e;
  color: #e2e8f0;
`;

export const Tw = () => (
  <div>
    <div className="text-zinc-900 dark:text-white bg-white dark:bg-white/5 p-4">texto</div>
    <button className="bg-emerald-700 text-white focus-visible:ring-2">ok</button>
    <input className="outline-none focus-visible:ring-2" />
  </div>
);
