import React from 'react';
import ReactDOM from 'react-dom/client';
import { OptionsApp } from './App';
import './style.css';

document.title = browser.i18n.getMessage('extensionName');
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><OptionsApp /></React.StrictMode>,
);
