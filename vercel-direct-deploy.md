# Guía Rápida: Despliegue en la Web (Sin Git ni GitHub)

Esta guía te permite subir tu aplicación de fútbol a internet directamente desde tu terminal utilizando **Vercel CLI**. Es el método más rápido si no tienes Git o GitHub configurado.

---

## ⚡ Pasos para el Despliegue Directo

### Paso 1: Abrir la Terminal en VS Code
1. Abre tu proyecto en Visual Studio Code.
2. Abre una nueva terminal integrada pulsando **`Ctrl` + `~`** (o yendo al menú superior: **Terminal > New Terminal**).

### Paso 2: Iniciar sesión en Vercel
Ejecuta el siguiente comando para vincular tu terminal con tu cuenta de Vercel (si no tienes cuenta, te guiará para crear una gratis en 10 segundos):
```bash
npx vercel login
```
*Te pedirá elegir un método de login (Recomendado: **Continue with Web Browser** o **Email**).*

### Paso 3: Inicializar y desplegar el proyecto
Ejecuta el siguiente comando en la terminal para iniciar la configuración:
```bash
npx vercel
```

El asistente te hará unas preguntas sencillas. Respóndelas pulsando **Enter** para usar las opciones por defecto:
1. `Set up and deploy “~/Desktop/ATHLETIC IA”?` 👉 Presiona **`Y`** y luego **Enter**.
2. `Which scope do you want to deploy to?` 👉 Presiona **Enter** (tu nombre de usuario).
3. `Link to existing project?` 👉 Escribe **`N`** (No) y presiona **Enter**.
4. `What’s your project’s name?` 👉 Presiona **Enter** (o escribe `mi-equipo-indautxu`).
5. `In which directory is your code located?` 👉 Presiona **Enter** (`./`).
6. `Want to modify these settings?` 👉 Escribe **`N`** (No) y presiona **Enter**.

*Vercel creará el proyecto en la nube y subirá una versión de desarrollo temporal.*

### Paso 4: Añadir las variables de Supabase
Para que la web pública funcione, debes ingresar las credenciales de tu base de datos en Vercel:
1. Ve al panel de control web de Vercel (el enlace que te dará la terminal o en [vercel.com/dashboard](https://vercel.com/dashboard)).
2. Entra en tu nuevo proyecto (`mi-equipo-indautxu`).
3. Ve a la pestaña **Settings** (Configuración) > **Environment Variables** (Variables de Entorno).
4. Agrega las siguientes dos variables (cópialas de tu archivo `.env.local`):
   * **Nombre (Key)**: `NEXT_PUBLIC_SUPABASE_URL`
     * **Valor (Value)**: `https://jdkshextphguyyiwwtyt.supabase.co`
   * **Nombre (Key)**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     * **Valor (Value)**: `sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn...` (Tu anon key completa)
   * *(Opcional)* Si deseas cambiar la contraseña de entrenadores por defecto (`indautxu2026`), agrega esta variable:
     * **Nombre (Key)**: `NEXT_PUBLIC_COACH_PASSKEY`
     * **Valor (Value)**: `tu-nueva-contraseña`

### Paso 5: Despliegue Final a Producción
Una vez guardadas las variables de entorno, vuelve a tu terminal en VS Code y ejecuta el comando de despliegue de producción:
```bash
npx vercel --prod
```

¡Listo! Al finalizar la barra de progreso, la terminal te dará el enlace público final de producción (ej: `https://mi-equipo-indautxu.vercel.app`).

Cualquier entrenador ahora podrá entrar a esa dirección desde su móvil o PC y trabajar contigo en tiempo real compartiendo las estadísticas del equipo.
