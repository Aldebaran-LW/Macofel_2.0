# Instalador PDV Macofel (Windows)

1. No repositório **PDV-Macofel**, após `npm run tauri:build`, o instalador NSIS fica em:
   `src-tauri/target/release/bundle/nsis/` (nome parecido com `PDV Macofel_*_x64-setup.exe`).

2. Copie o `.exe` para esta pasta com um nome estável, por exemplo:
   `pdv-macofel-setup.exe`

3. No **Macofel 2.0** (`.env` / Vercel), configure **uma** das opções:
   - `PDV_DESKTOP_INSTALLER_URL=https://www.seudominio.com/downloads/pdv-macofel-setup.exe`
   - ou `PDV_DESKTOP_INSTALLER_PATH=/downloads/pdv-macofel-setup.exe` e `NEXTAUTH_URL` com a URL pública do site.

4. Faça deploy; na área **Master Admin → PDV Desktop** o botão de descarga aparece.

Os ficheiros `*.exe` / `*.msi` estão no `.gitignore` para não inflar o Git; envie-os no deploy (commit local opcional em fluxos internos) ou hospede em GitHub Releases e use só a URL em `PDV_DESKTOP_INSTALLER_URL`.
