Paso por paso

1. Crear un bot en telegram
2. ir a @botfather y ecribir /newbot
3. escribir nombre: adsmna_bot
4. Esto genera un token para poder usar en las llamadas del backend:

```
Done! Congratulations on your new bot. You will find it at t.me/adsmna_bot.
You can now add a description, about section and profile picture for your bot,
see /help for a list of commands. By the way, when you've finished creating your cool bot,
ping our Bot Support if you want a better username for it. Just make sure the bot is fully
operational before you do this.

Use this token to access the HTTP API: en .env TELEGRAM_TOKEN
Keep your token secure and store it safely, it can be used by anyone to control your bot.

For a description of the Bot API, see this page: https://core.telegram.org/bots/api
```

upload cli for cloud:  
gcloud functions deploy bot --gen1 --entry-point bot --runtime nodejs18 --trigger-http --project sistemamoviltrack
