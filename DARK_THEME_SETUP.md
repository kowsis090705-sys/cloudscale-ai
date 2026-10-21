# Dark professional theme
The React UI has a fixed dark navy background with violet accents, cards, navigation, and accessible form styling.
Changes are limited to `frontend/src/index.css`, `frontend/src/App.jsx`, and `frontend/src/components/Navbar.jsx`. Booking APIs and Java/Python services are unchanged.

## Get the updated website locally (Windows)
1. Save local changes like `src/main/resources/application.properties` outside the repo folder before replacing your downloaded ZIP. **Never share or commit database passwords.**
2. Download the `integrated-app` branch ZIP from GitHub, extract it, and open the inner project folder in VS Code.
3. Restore your own local application.properties under `src/main/resources/`.
4. Start the Spring Boot backend from the project root: `.\mvnw.cmd spring-boot:run`.
5. In a second VS Code terminal: `cd frontend`; `npm.cmd install`; `npm.cmd run dev`.
6. Open the Local URL shown by Vite, which may be localhost:5173 or localhost:5174.

Or, if your existing working folder is already a Git clone of this repository, `git pull origin integrated-app` may be used after ensuring your local configuration and work are preserved.

## Verification
The theme changes have been committed to GitHub; no automated browser or runtime verification was performed by this update. Event booking, cancel and rebooking should still be checked after pulling the changes.
