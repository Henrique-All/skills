// FIXTURE RUIM — cada bloco deve disparar a regra indicada no comentário.
import styled, { css } from 'styled-components';

// FIXED_NAV_COLLISION (warn)
export const MobileToggleButton = styled.button`
  position: fixed;
  top: 16px;
  left: 16px;
  z-index: 1001;
`;

// STACKED_COLUMNS (error) — 3 colunas viram pilha, nada é escondido
export const Shell = styled.div`
  display: grid;
  grid-template-columns: 300px 1fr 310px;
  height: 100dvh;
  @media (max-width: 1024px) {
    display: flex;
    flex-direction: column;
  }
`;

// display:none sem relação com o Shell (não pode silenciar a regra acima)
export const Unrelated = styled.div`
  display: none;
`;

// GRID_FIXED_OVERFLOW (error)
export const Board = styled.div`
  display: grid;
  grid-template-columns: 280px 280px 280px;
`;

// VIEWPORT_100VH (error)
export const Page = styled.main`
  height: 100vh;
`;

// SAFE_AREA_BOTTOM (error)
export const BottomBar = styled.nav`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
`;

// IOS_INPUT_ZOOM (error)
export const Search = styled.input`
  font-size: 14px;
`;

// IOS_INPUT_ZOOM (error) — via seletor filho
export const SearchWrap = styled.div`
  input {
    font-size: 0.8rem;
  }
`;

// SMALL_TOUCH_TARGET (warn)
export const IconBtn = styled.button`
  width: 32px;
  height: 32px;
`;

// FIXED_WIDTH_SPILL (error)
export const Modal = styled.div`
  width: 520px;
`;

// Tailwind
export const Tw = () => (
  <div>
    <div className="h-screen">conteúdo</div>
    <nav className="fixed bottom-0 left-0 right-0 flex">barra</nav>
    <input className="text-sm border" />
  </div>
);

export const conditional = css`
  color: red;
`;
