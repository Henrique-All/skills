// FIXTURE BOA — padrões corretos; nenhuma regra (error ou warn) pode disparar.
import styled, { css } from 'styled-components';

// Botão fixo + cabeçalho com padding compensatório no mesmo breakpoint
export const MobileToggleButton = styled.button`
  display: none;
  position: fixed;
  top: 12px;
  left: 12px;
  width: 44px;
  height: 44px;
  @media (max-width: 768px) {
    display: flex;
  }
`;

export const Header = styled.header`
  @media (max-width: 768px) {
    padding-left: 64px;
    min-height: 44px;
  }
`;

// Master-Detail: colunas inativas somem no mobile conforme estado
export const Shell = styled.div<{ $hasSelection: boolean }>`
  display: grid;
  grid-template-columns: 300px 1fr 310px;
  height: 100vh;
  height: 100dvh;
  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
    > aside {
      display: none;
    }
    > section:first-child {
      display: ${({ $hasSelection }) => ($hasSelection ? 'none' : 'flex')};
    }
  }
`;

// Grade de cards iguais pode empilhar (não é shell)
export const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

// Barra inferior com safe area
export const BottomBar = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
`;

// Overlay que cobre a tela inteira não precisa de safe area
export const Backdrop = styled.div`
  position: fixed;
  inset: 0;
`;

// Input 16px no mobile
export const Search = styled.input`
  font-size: 14px;
  @media (max-width: 768px) {
    font-size: 16px;
  }
`;

// Botão pequeno no desktop, 44px no mobile
export const IconBtn = styled.button`
  width: 32px;
  height: 32px;
  @media (max-width: 768px) {
    min-width: 44px;
    min-height: 44px;
  }
  .badge {
    width: 8px;
    height: 8px;
  }
`;

// Largura com teto
export const Modal = styled.div`
  width: 520px;
  max-width: calc(100vw - 32px);
`;

// Supressão consciente com motivo
export const Legacy = styled.div`
  /* audit-ignore VIEWPORT_100VH: tela só usada em quiosque desktop */
  height: 100vh;
`;

export const Tw = () => (
  <div>
    <div className="h-screen h-dvh">conteúdo</div>
    <nav className="fixed bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)]">barra</nav>
    <input className="text-base md:text-sm border" />
    <button className="min-h-11 min-w-11 h-8">ok</button>
  </div>
);

export const conditional = css`
  color: red;
`;
