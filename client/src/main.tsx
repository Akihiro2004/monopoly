import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/bricolage-grotesque';
import './index.css';
import './styles/components.css';
import './styles/home.css';
import './styles/lobby.css';
import './styles/game.css';
import './styles/game-desktop.css';
import './styles/game-mobile.css';
import './styles/modals.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
