import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';

@Controller()
export class AppController {
  @Get()
  getLanding(@Res() res: Response) {
    res.type('html').send(`<!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>YoLeChat — Accueil</title>
        <link rel="stylesheet" href="/home/styles.css" />
        <style>
          html, body { height: 100%; }
          body { margin: 0; display: grid; place-items: center; background: #0f1216; color: #e6e9ef; font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
          .landing { text-align: center; display: grid; gap: 16px; padding: 24px; }
          .title { margin: 0; font-size: clamp(28px, 6vw, 40px); }
          .cta { display: inline-flex; align-items: center; justify-content: center; padding: 12px 20px; border-radius: 10px; border: 1px solid #232a37; background: #4f7cfb; color: #fff; cursor: pointer; }
          .cta:hover { background: #3c63d8; }
          .cta:focus-visible { outline: 3px solid rgba(79,124,251,0.35); }
        </style>
      </head>
      <body>
        <main class="landing" aria-label="Accueil">
          <h1 class="title">Prêt à tchater ?</h1>
          <button type="button" class="cta" id="cta">Se connecter</button>
        </main>
        <script>
          document.getElementById('cta').addEventListener('click', () => {
            window.location.assign('/home?tab=login');
          });
        </script>
      </body>
    </html>`);
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('chat')
  getChat(@Res() res: Response) {
    res.type('html').send(`<!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>YoLeChat — Chat général</title>
        <link rel="stylesheet" href="/home/styles.css" />
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
        <style>
          .chat { display: grid; grid-template-rows: 1fr auto auto; gap: 12px; height: 100vh; padding: 12px; }
          #messages { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
          #messages li { padding: 8px 10px; }
          .msg { display: inline-flex; gap: 8px; }
          .author { font-weight: 600; }
          .compose { display: grid; grid-template-columns: 1fr auto; gap: 8px; }
          #typing { min-height: 20px; color: #9aa4b2; }
          #feedback { min-height: 20px; font-size: 14px; color: #ff6b6b; }
        </style>
      </head>
      <body>
        <main class="container chat" aria-label="Chat général">
          <ul id="messages"></ul>
          <div id="typing"></div>
          <div id="feedback"></div>
          <form id="sendForm" class="compose">
            <input id="messageInput" type="text" placeholder="Écrire un message" />
            <button class="btn primary" type="submit">Envoyer</button>
          </form>
        </main>
        <script src="/home/chat.js"></script>
      </body>
    </html>`);
  }
}
