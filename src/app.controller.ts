import { Controller, Get, Res } from '@nestjs/common';
import { AppService } from './app.service';
import type { Response } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

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
}
