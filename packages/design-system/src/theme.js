export const jempLightTheme = {
  dark: false,
  colors: {
    primary: '#C66A2B',
    secondary: '#1F3A5F',
    accent: '#2E7D6E',
    success: '#2E9E5B',
    warning: '#D18B1F',
    error: '#C0392B',
    background: '#F7F4EF',
    surface: '#FFFFFF',
  },
}

export const jempDarkTheme = {
  dark: true,
  colors: {
    primary: '#E59A65',
    secondary: '#8FA9CC',
    accent: '#57A899',
    success: '#5BC67D',
    warning: '#E3B35B',
    error: '#E07166',
    background: '#12151B',
    surface: '#1A2029',
  },
}

export function createJempVuetifyTheme({
  defaultTheme = 'guitarjemp',
  lightThemeName = 'guitarjemp',
  darkThemeName = 'guitarjempDark',
} = {}) {
  return {
    defaultTheme,
    themes: {
      [lightThemeName]: jempLightTheme,
      [darkThemeName]: jempDarkTheme,
    },
  }
}
