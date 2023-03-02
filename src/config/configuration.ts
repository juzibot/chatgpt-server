export default () => {
  return {
    port: process.env.PORT || 4537,
    apiMode: process.env.API_MODE === 'true',

    mongoUri: process.env.MONGO_URI,

    captchaToken: process.env.CAPTCHA_TOKEN,
    nopechaKey: process.env.NOPECHA_KEY,
    executablePath: process.env.EXECUTABLE_PATH,
    proxyServer: process.env.PROXY_SERVER,
    userDataDir: process.env.USER_DATA_DIR,
  }
}
