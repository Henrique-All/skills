// FIXTURE RUIM (tema duplo) — cada bloco deve disparar a regra indicada.
import styled, { css } from 'styled-components';
import { isLight } from '../theme';

// LIGHT_MODE_WHITE_TEXT (error): branco fixo sobre superfície do tema
export const Toast = styled.div`
  background: ${({ theme }) => theme.colors.surface};
  color: white;
`;

// LOW_CONTRAST_LIGHT (error): ramo claro ilegível sobre fundo claro
export const Muted = styled.p`
  background: ${({ theme }) => (isLight(theme) ? '#ffffff' : '#16161a')};
  color: ${({ theme }) => (isLight(theme) ? '#cbd5e1' : '#94a3b8')};
`;

// LOW_CONTRAST_DARK (error): ramo escuro ilegível sobre fundo escuro
export const Label = styled.span`
  background: ${({ theme }) => (isLight(theme) ? '#ffffff' : '#0b0b0e')};
  color: ${({ theme }) => (isLight(theme) ? '#0f172a' : '#1e293b')};
`;

// LIGHT_MODE_GHOST_SURFACE (error x2)
export const Card = styled.div`
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: ${({ theme }) => theme.colors.text};
`;

// HARDCODED_DARK_SURFACE (warn)
export const Panel = styled.section`
  background: #0f172a;
  color: ${({ theme }) => theme.colors.text};
`;

// OUTLINE_NONE_WITHOUT_FOCUS (warn)
export const Field = styled.input`
  outline: none;
  color: ${({ theme }) => theme.colors.text};
`;

// PURPLE_GRADIENT_SLOP (warn)
export const Hero = styled.div`
  background: linear-gradient(135deg, #7c3aed 0%, #db2777 100%);
  color: #ffffff;
`;

export const Tw = () => (
  <div>
    <p className="text-zinc-900 dark:text-zinc-100">projeto usa dark:</p>
    {/* LIGHT_MODE_WHITE_TEXT + LIGHT_MODE_GHOST_SURFACE (Tailwind) */}
    <div className="text-white bg-white/5 p-4">texto</div>
    {/* HARDCODED_DARK_SURFACE (Tailwind) */}
    <div className="bg-zinc-900 p-4">painel</div>
  </div>
);

export const unused = css`
  color: red;
`;
