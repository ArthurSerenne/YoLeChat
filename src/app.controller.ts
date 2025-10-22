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
        <link href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&display=swap" rel="stylesheet" />
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
        <link href="https://fonts.googleapis.com/css2?family=Mochiy+Pop+One&display=swap" rel="stylesheet" />
        <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
        <style>
          :root {
            --accent-600:#3a8b12; --accent-500:#48ad16; --accent-400:#59c826; --accent-300:#71d941; --accent-200:#9ae66f; --accent-100:#c7f5aa;
            --bg-900:#0f1216; --bg-800:#12161c; --bg-700:#171b22;
            --text-100:#e6e9ef; --text-300:#b7c0cc;
            --border-600:#232a37;
            --serverbar-h: 44px;
          }
          :root { --primary: var(--accent-500); --primary-700: var(--accent-600); --ring: rgba(72,173,22,0.35); }

          body { background: linear-gradient(180deg, var(--bg-900) 0%, var(--bg-800) 100%); color: var(--text-100); }

          .container.chat { margin: 0 auto; max-width: none; padding: 0; }
          .chat {
            display: grid;
            --users-width: 260px;
            grid-template-columns: 220px 1fr var(--users-width);
            grid-template-rows: 1fr auto;
            grid-template-areas: "sidebar main users" "sidebar compose users";
            height: calc(100dvh - var(--serverbar-h));
            gap: 0;
          }
          .chat.users-collapsed { --users-width: 0px; }

          .sidebar {
            grid-area: sidebar;
            background: var(--bg-800);
            border-right: 1px solid var(--border-600);
            padding: 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .rightbar {
            grid-area: users;
            background: var(--bg-800);
            border-left: 1px solid var(--border-600);
            padding: 10px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .sidebar-title { margin: 4px 0 10px; font-size: 14px; color: var(--text-300); letter-spacing: .2px; }
          .users { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; overflow: auto; }
          .sidebar-actions { margin-top: auto; display: grid; gap: 8px; }
          .sidebar-actions .btn { width: 100%; display: flex; font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; }
          .users li { display:flex; align-items:center; gap: 10px; padding: 6px 8px; border-radius: 8px; }
          .users li:hover { background: rgba(35,42,55,0.5); }
          .presence { width: 10px; height: 10px; border-radius: 50%; background: var(--accent-500); box-shadow: 0 0 0 2px rgba(72,173,22,0.15); }
          .username { font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; letter-spacing: 0; }

          .servers { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; flex: 1 1 auto; overflow: auto; }
          .servers li { display:flex; align-items:center; gap: 10px; padding: 6px 8px; border-radius: 8px; cursor: pointer; }
          .servers li:hover { background: rgba(35,42,55,0.5); }
          .servers li.active { background: rgba(72,173,22,0.12); border: 1px solid rgba(72,173,22,0.25); }

          .invite-box { display: grid; gap: 6px; margin: 8px 0; }
          .invite-box input { width: 100%; background: var(--bg-700); border: 1px solid var(--border-600); color: var(--text-100); border-radius: 10px; padding: 8px 10px; outline: none; }
          .invite-box input::placeholder { color: var(--text-300); }
          .invite-box input:focus { border-color: var(--ring); box-shadow: 0 0 0 3px rgba(72,173,22,0.15); }
          #inviteSuggestions { max-height: 160px; overflow: auto; }
          .channel { grid-area: main; display: grid; grid-template-rows: auto 1fr auto auto; gap: 6px; padding: 8px; min-height: 0; }
          .channel-header { display:flex; justify-content:flex-end; align-items:center; padding: 4px 0; }
          #messages { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; align-items: flex-start; align-content: flex-start; overflow: auto; min-height: 0; }
          #messages li { padding: 4px 8px; margin: 0; }
          #messages li + li { margin-top: 2px; }
          #messages li.group-start { margin-top: 14px; }
          #messages li:first-child { margin-top: 0; }
          .msg { display: inline-flex; gap: 6px; align-items: center; }
          .author { font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; }
          .author::after { content: ":"; margin-left: 2px; margin-right: 4px; color: currentColor; }
          .content { line-height: 1.3; word-break: break-word; }
          .compose { grid-area: compose; display: grid; grid-template-columns: 1fr auto; gap: 10px; padding: 10px; border-top: 1px solid var(--border-600); background: var(--bg-800); }
          #messageInput { width: 100%; background: var(--bg-700); border: 1px solid var(--border-600); color: var(--text-100); border-radius: 10px; padding: 10px 12px; outline: none; }
          #messageInput::placeholder { color: var(--text-300); }
          #messageInput:focus { border-color: var(--ring); box-shadow: 0 0 0 3px rgba(72,173,22,0.15); }
          .compose .btn { font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 500; padding: 10px 16px; border-radius: 10px; gap: 8px; }
          .compose .btn.primary { background: linear-gradient(90deg, var(--accent-500), var(--accent-400)); border-color: var(--accent-600); color: white; }
          .compose .btn.primary:hover { background: linear-gradient(90deg, var(--accent-600), var(--accent-500)); }
          .compose .btn.primary:focus-visible { outline: 3px solid var(--ring); }
          .btn .icon { width: 16px; height: 16px; display: inline-flex; align-items: center; }
          .btn .icon svg { width: 100%; height: 100%; display: block; }
          .btn.danger { background: #ff6b6b; border-color: #d45555; color: #fff; }
          .btn.danger:hover { background: #d45555; }
          .btn.danger:focus-visible { outline: 3px solid rgba(255,107,107,0.35); }
          #typing { min-height: 18px; color: var(--text-300); }
          #feedback { min-height: 18px; font-size: 14px; color: #ff6b6b; }
          .serverbar { position: sticky; top: 0; z-index: 2; height: var(--serverbar-h); background: var(--bg-800); border-bottom: 1px solid var(--border-600); padding: 8px 12px; box-sizing: border-box; display: flex; align-items: center; gap: 10px; }
          .server-name { font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; font-weight: 600; }
          .modal { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; background: rgba(0,0,0,0.6); z-index: 20; }
          .modal.show { display: flex; }
          .modal-dialog { width: min(520px, 92vw); background: var(--bg-800); border: 1px solid var(--border-600); border-radius: 12px; padding: 16px; box-shadow: 0 8px 40px rgba(0,0,0,0.5); }
          .modal-header { display:flex; align-items:center; justify-content: space-between; margin-bottom: 12px; }
          .modal-title { margin: 0; font-size: 18px; font-family: 'Mochiy Pop One', system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; }
          .modal-actions { display:flex; justify-content:flex-end; gap: 8px; margin-top: 12px; }
          .modal .feedback { margin-top: 8px; min-height: 20px; }
          .toasts { position: fixed; bottom: 16px; right: 16px; display: grid; gap: 8px; z-index: 50; }
          .toast { background: var(--bg-800); border: 1px solid var(--border-600); color: var(--text-100); padding: 10px 12px; border-radius: 8px; box-shadow: 0 6px 30px rgba(0,0,0,0.4); }
          .toast.ok { border-color: var(--accent-600); }
          .toast.err { border-color: #d45555; }
        </style>
      </head>
      <body>
        <header class="serverbar" aria-label="Serveur"><span id="serverTitle" class="server-name">Serveur général</span></header>
        <main class="container chat" aria-label="Chat général">
          <aside class="sidebar" aria-label="Navigation">
             <h2 class="sidebar-title">Mes serveurs</h2>
             <ul id="serverList" class="servers"></ul>
 
             <div class="sidebar-actions">
               <button id="inviteMemberBtn" class="btn outline" type="button" aria-label="Inviter un membre" title="Inviter un membre">
                 <span class="icon" aria-hidden="true">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                     <path d="M1 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1zm5-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                     <path fill-rule="evenodd" d="M13.5 5a.5.5 0 0 1 .5.5V7h1.5a.5.5 0 0 1 0 1H14v1.5a.5.5 0 0 1-1 0V8h-1.5a.5.5 0 0 1 0-1H13V5.5a.5.5 0 0 1 .5-.5"/>
                   </svg>
                 </span>
                 <span class="label">Inviter un membre</span>
               </button>
               <button id="createServerBtn" class="btn outline" type="button" aria-label="Créer un serveur" title="Créer un serveur">
                 <span class="icon" aria-hidden="true">
                   <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0M8.5 4.5a.5.5 0 0 0-1 0V7H5a.5.5 0 0 0 0 1h2.5v2.5a.5.5 0 0 0 1 0V8H11a.5.5 0 0 0 0-1H8.5z"/>
                   </svg>
                 </span>
                 <span class="label">Nouveau serveur</span>
               </button>
               <button id="clearBtn" class="btn danger" type="button">Vider l’historique</button>
               <button id="logoutBtn" class="btn outline" type="button">Se déconnecter</button>
             </div>
           </aside>
          <section class="channel" aria-label="Messages">
            <div class="channel-header">
              <button id="toggleUsers" class="btn outline" type="button" aria-label="Masquer utilisateurs" title="Masquer utilisateurs">
                <span class="icon" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M7 14s-1 0-1-1 1-4 5-4 5 3 5 4-1 1-1 1zm4-6a3 3 0 1 0 0-6 3 3 0 0 0 0 6m-5.784 6A2.24 2.24 0 0 1 5 13c0-1.355.68-2.75 1.936-3.72A6.3 6.3 0 0 0 5 9c-4 0-5 3-5 4s1 1 1 1zM4.5 8a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5"/>
                  </svg>
                </span>
              </button>
            </div>
            <ul id="messages"></ul>
            <div id="typing"></div>
            <div id="feedback"></div>
          </section>
          <aside class="rightbar" aria-label="Utilisateurs connectés">
            <h2 class="sidebar-title">Utilisateurs</h2>
            <ul id="userList" class="users"></ul>
          </aside>
          <form id="sendForm" class="compose" aria-label="Composer un message">
            <textarea id="messageInput" placeholder="Écrire un message" rows="1"></textarea>
            <button class="btn primary" type="submit" aria-label="Envoyer">
              <span class="icon" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/></svg>
              </span>
              <span class="label">Envoyer</span>
            </button>
          </form>
        </main>

        <div id="createServerModal" class="modal" aria-hidden="true">
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="createServerTitle">
            <div class="modal-header">
              <h3 id="createServerTitle" class="modal-title">Créer un serveur</h3>
              <button type="button" class="btn outline" id="createServerClose">Fermer</button>
            </div>
            <form id="createServerForm" class="form" autocomplete="off">
              <div class="field">
                <label>Nom du serveur</label>
                <input type="text" name="name" minlength="2" required placeholder="ex: Équipe Produit" />
              </div>
              <div class="field">
                <label>Invitations (noms d’utilisateur séparés par des virgules)</label>
                <input type="text" name="invites" placeholder="ex: alice, bob, charlie" />
              </div>
              <div class="modal-actions">
                <button type="button" class="btn outline" id="createServerCancel">Annuler</button>
                <button type="submit" class="btn primary">Créer</button>
              </div>
              <div id="createServerFeedback" class="feedback" aria-live="polite"></div>
            </form>
          </div>
        </div>

        <div id="inviteModal" class="modal" aria-hidden="true">
          <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="inviteTitle">
            <div class="modal-header">
              <h3 id="inviteTitle" class="modal-title">Inviter un membre</h3>
              <button type="button" class="btn outline" id="inviteClose">Fermer</button>
            </div>
            <form id="inviteForm" class="form" autocomplete="off" onsubmit="return false">
              <div class="field">
                <label>Nom d’utilisateur</label>
                <input type="text" id="inviteInput" placeholder="ex: alice" autocomplete="off" />
              </div>
              <ul id="inviteSuggestions" class="users"></ul>
              <div class="modal-actions">
                <button type="button" class="btn outline" id="inviteCancelBtn">Annuler</button>
              </div>
              <div id="inviteFeedback" class="feedback" aria-live="polite"></div>
            </form>
          </div>
        </div>
        <div id="toastContainer" class="toasts" aria-live="polite" aria-atomic="true"></div>

        <script src="/home/chat.js"></script>
      </body>
    </html>`);
  }
}
