import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/lilita-one';
import '@fontsource/nunito/600.css';
import '@fontsource/nunito/700.css';
import '@fontsource/nunito/800.css';
import '@fontsource/nunito/900.css';
import './index.css';
import './styles/components.css';
import './styles/home.css';
import './styles/lobby.css';
import './styles/game.css';
import './styles/game-desktop.css';
import './styles/game-mobile.css';
import './styles/modals.css';
import './styles/bank.css';
import App from './App.tsx';
import { registerPwa } from './pwa.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

registerPwa();
