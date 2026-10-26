# Jemphub VPS Deployment

This project is a static landing page. Upload `index.html`, `styles.css`, `design-system/styles.css`, and `design-system/tokens.css` to your VPS and serve them with Nginx.

## Target setup

- `jemphub.com` and `www.jemphub.com` serve this hub page
- `stemplayer.jemphub.com` points to your StemPlayer app
- `earjemp.jemphub.com` points to your EarJemp app
- `notejemp.jemphub.com` serves the NoteJemp app from `/var/www/notejemp`

## 1. DNS records

Create these DNS records at your domain provider:

- `@` -> `A` -> `YOUR_VPS_IP`
- `www` -> `A` -> `YOUR_VPS_IP`
- `stemplayer` -> `A` -> `YOUR_VPS_IP`
- `earjemp` -> `A` -> `YOUR_VPS_IP`
- `notejemp` -> `A` -> `YOUR_VPS_IP`

## 2. Upload the hub page

Copy the files to your VPS:

```bash
scp index.html styles.css user@YOUR_VPS_IP:/tmp/jemphub/
scp design-system/styles.css design-system/tokens.css user@YOUR_VPS_IP:/tmp/jemphub/design-system/
```

Then on the VPS:

```bash
sudo mkdir -p /var/www/jemphub
sudo mkdir -p /var/www/jemphub/design-system
sudo cp /tmp/jemphub/index.html /var/www/jemphub/
sudo cp /tmp/jemphub/styles.css /var/www/jemphub/
sudo cp /tmp/jemphub/design-system/styles.css /var/www/jemphub/design-system/
sudo cp /tmp/jemphub/design-system/tokens.css /var/www/jemphub/design-system/
sudo chown -R www-data:www-data /var/www/jemphub
```

If your server does not use `www-data`, replace it with the correct web user.

## 3. Install Nginx

Ubuntu/Debian:

```bash
sudo apt update
sudo apt install -y nginx
```

## 4. Install the Nginx config

A ready-to-adapt config is provided in `deploy/nginx/jemphub.conf`.

Copy it to the VPS:

```bash
scp deploy/nginx/jemphub.conf user@YOUR_VPS_IP:/tmp/
```

Then on the VPS:

```bash
sudo cp /tmp/jemphub.conf /etc/nginx/sites-available/jemphub.conf
sudo ln -s /etc/nginx/sites-available/jemphub.conf /etc/nginx/sites-enabled/jemphub.conf
sudo nginx -t
sudo systemctl reload nginx
```

If there is still an old default config serving EarJemp on the root domain, disable it first:

```bash
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Enable HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request certificates (including NoteJemp after its DNS record resolves):

```bash
sudo certbot --nginx -d jemphub.com -d www.jemphub.com -d stemplayer.jemphub.com -d earjemp.jemphub.com -d notejemp.jemphub.com
```

## 6. StemPlayer routing

The supplied Nginx config assumes StemPlayer runs locally on port `3001`:

```text
http://127.0.0.1:3001
```

If your StemPlayer app runs on another port, change `proxy_pass` in the config.

The supplied Nginx config serves NoteJemp's static build from `/var/www/notejemp`.
After adding the `notejemp` DNS record, install or update the Nginx config and request its HTTPS certificate.

## 7. Current project links in the hub

The hub page currently links to:

- GuitarJemp: `https://guitarjemp.jemphub.com/`
- NoteJemp: `https://notejemp.jemphub.com/`
- EarJemp: `https://earjemp.jemphub.com/`
- StemPlayer: `https://stemplayer.jemphub.com/`

The page uses the shared Jemp look: `design-system/tokens.css` (colours, fonts) and
`design-system/styles.css` (base controls), the same as GuitarJemp and NoteJemp.

If you want a different URL later, edit `index.html` before uploading.

## 8. Updating the page later

Whenever you change the page locally:

```bash
scp index.html styles.css user@YOUR_VPS_IP:/tmp/jemphub/
scp design-system/styles.css design-system/tokens.css user@YOUR_VPS_IP:/tmp/jemphub/design-system/
ssh user@YOUR_VPS_IP
sudo cp /tmp/jemphub/index.html /var/www/jemphub/
sudo cp /tmp/jemphub/styles.css /var/www/jemphub/
sudo cp /tmp/jemphub/design-system/styles.css /var/www/jemphub/design-system/
sudo cp /tmp/jemphub/design-system/tokens.css /var/www/jemphub/design-system/
```

No rebuild step is needed.

## 9. One-command deploy script

An executable deploy script is included at `deploy/publish.sh`.

Run it from the project root:

```bash
VPS_HOST=YOUR_VPS_IP VPS_USER=root ./deploy/publish.sh
```

Optional overrides:

- `REMOTE_ROOT=/var/www/jemphub` (default)
- `WEB_USER=www-data` (default)

Example with overrides:

```bash
VPS_HOST=YOUR_VPS_IP VPS_USER=root REMOTE_ROOT=/var/www/jemphub WEB_USER=www-data ./deploy/publish.sh
```

The script uploads:

- `index.html`
- `styles.css`
- `design-system/styles.css`
- `design-system/tokens.css`

Then it publishes the files on the VPS, runs `nginx -t`, and reloads Nginx.
