FROM node:19 AS builder

# Create app directory
WORKDIR /app

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./
ENV PUPPETEER_SKIP_DOWNLOAD=1
# Install app dependencies
RUN npm install

COPY . .

RUN npm run build

FROM node:19 
# We don't need the standalone Chromium
RUN apt-get install -y wget \ 
  && wget --no-check-certificate -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \ 
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list \
  && apt-get update && apt-get -y install google-chrome-stable chromium  xvfb\
  && rm -rf /var/lib/apt/lists/* \
  && echo "Chrome: " && google-chrome --version
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

EXPOSE 3000
CMD xvfb-run --server-args="-screen 0 1280x800x24 -ac -nolisten tcp -dpi 96 +extension RANDR" npm run start:prod