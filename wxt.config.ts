import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  outDir: 'dist',
  outDirTemplate: 'unpacked-extension',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: '__MSG_extensionName__',
    description: '__MSG_extensionDescription__',
    minimum_chrome_version: '120',
    default_locale: 'en',
    permissions: ['storage', 'alarms', 'scripting', 'activeTab'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    icons: {
      16: 'icon/16.png',
      32: 'icon/32.png',
      48: 'icon/48.png',
      128: 'icon/128.png',
    },
    action: {
      default_title: '__MSG_extensionName__',
      default_icon: {
        16: 'icon/16.png',
        32: 'icon/32.png',
        48: 'icon/48.png',
        128: 'icon/128.png',
      },
    },
  },
});
