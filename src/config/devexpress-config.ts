import { loadMessages, locale } from 'devextreme/localization';
import esMessages from 'devextreme/localization/messages/es.json';

export const configureDevExpress = () => {
  loadMessages(esMessages);
  locale('es-es');
  
};