import { createRoot } from 'react-dom/client';
import { createElement } from 'react';
import { App } from './App';

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(createElement(App));
