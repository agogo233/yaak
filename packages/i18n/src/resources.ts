import commonEn from "./locales/en/common.json";
import paletteEn from "./locales/en/commandPalette.json";
import settingsEn from "./locales/en/settings.json";
import sidebarEn from "./locales/en/sidebar.json";
import commonZh from "./locales/zh-CN/common.json";
import paletteZh from "./locales/zh-CN/commandPalette.json";
import settingsZh from "./locales/zh-CN/settings.json";
import sidebarZh from "./locales/zh-CN/sidebar.json";

export const resources = {
  en: {
    translation: { ...commonEn, ...sidebarEn, ...paletteEn, ...settingsEn },
  },
  "zh-CN": {
    translation: { ...commonZh, ...sidebarZh, ...paletteZh, ...settingsZh },
  },
};
