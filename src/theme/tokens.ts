/** FirstLane's light-first palette: warm paper, fresh sage and restrained lime.
 * Dark mode stays an explicit preference; text is never painted pale on light cards.
 */
export const palette = {
    light: { background: '#F6F5EF', surface: '#FFFFFF', raised: '#EEEFE7', text: '#1C2922', muted: '#626E65', line: '#DFE4D8', accent: '#D9F778', accentText: '#243C2E', forest: '#243C2E', success: '#386347', successBg: '#EAF2E5', danger: '#A53D33', dangerBg: '#FBECEA', lavender: '#F0EDF7', peach: '#F8EDE1', blue: '#EBF2F4', sage: '#EAF0DE', sageLine: '#D7E2C6', tab: '#FFFFFF', onForest: '#F6F5EF' },
    dark: { background: '#141E18', surface: '#202E25', raised: '#293A2F', text: '#F4F6ED', muted: '#B5C1B1', line: '#3B4D40', accent: '#D9F778', accentText: '#243C2E', forest: '#243C2E', success: '#B3D7A8', successBg: '#2A3F2D', danger: '#FFB6AD', dangerBg: '#462C29', lavender: '#363444', peach: '#43382E', blue: '#2C4044', sage: '#2B3D2D', sageLine: '#475B3B', tab: '#202E25', onForest: '#F6F5EF' }
};
export type Colors = typeof palette.light;
export const radius = { sm: 12, md: 18, lg: 24, xl: 30, pill: 100 };
export const space = { xs: 4, sm: 8, md: 12, lg: 18, xl: 24, xxl: 32 };
