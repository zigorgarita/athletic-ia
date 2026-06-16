# Guía de Despliegue en Vercel (Paso a Paso)

Esta guía detalla el proceso para subir y configurar la aplicación web de gestión deportiva en producción utilizando Vercel conectado a tu repositorio de Git.

## 📋 Lista de Verificación Pre-Despliegue

Antes de iniciar el deploy, asegúrate de:
1. **Configurar el proyecto localmente**: Comprobar que no haya errores de tipado ejecutando `npm run build` localmente.
2. **Obtener las credenciales de Supabase**: Necesitarás las claves `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` de tu panel de Supabase.

---

## 🚀 Pasos para el Despliegue en Vercel

### Paso 1: Subir tu código a un repositorio Git (GitHub/GitLab/Bitbucket)
1. Si aún no lo has hecho, inicializa un repositorio de Git en la carpeta del proyecto:
   ```bash
   git init
   git add .
   git commit -m "feat: setup complete & optimized soccer app"
   ```
2. Crea un repositorio remoto en tu proveedor Git preferido (ej: GitHub) y vincula tu rama local:
   ```bash
   git remote add origin https://github.com/tu-usuario/nombre-repositorio.git
   git branch -M main
   git push -u origin main
   ```

### Paso 2: Crear tu proyecto en Vercel
1. Ingresa a [Vercel](https://vercel.com/) e inicia sesión con tu cuenta de GitHub/GitLab.
2. En la consola principal (Dashboard), haz clic en el botón **"Add New..."** y selecciona **"Project"**.

### Paso 3: Importar tu repositorio
1. En la lista de repositorios sincronizados de Git, busca el repositorio que creaste en el **Paso 1**.
2. Haz clic en el botón **"Import"** al lado del repositorio correspondiente.

### Paso 4: Configurar el proyecto y Variables de Entorno
1. **Framework Preset**: Vercel detectará automáticamente que es un proyecto **Next.js** y configurará las opciones por defecto de construcción.
2. **Build and Output Settings**: Puedes dejarlas con los valores predeterminados.
3. **Environment Variables**:
   * Despliega la sección **"Environment Variables"**.
   * Añade las siguientes dos variables copiándolas exactamente de tu panel de Supabase (o de tu archivo `.env.local` local):
     * **Key**: `NEXT_PUBLIC_SUPABASE_URL`
       **Value**: `https://jdkshextphguyyiwwtyt.supabase.co`
     * **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
       **Value**: `sb_publishable_jAe-8URgFBKWfhp6bfkeNg_ToOiMaRn...` (Tu anon key pública completa)
   * Haz clic en **"Add"** para cada una.

### Paso 5: Desplegar (Deploy)
1. Haz clic en el botón **"Deploy"** al final de la página.
2. Vercel comenzará a compilar el proyecto en la nube. Este proceso suele tomar entre 1 y 2 minutos.
3. Una vez finalizado, verás un mensaje de éxito ("Congratulations!") y un enlace/preview de la aplicación publicada.

---

## 📱 Sincronización PWA y Móvil
Una vez que el sitio esté publicado en tu dominio de Vercel (ej: `https://athletic-ia.vercel.app`), puedes abrir el navegador en tu dispositivo móvil:
* **En iOS (Safari)**: Presiona el botón de compartir y selecciona **"Añadir a la pantalla de inicio"**. Se instalará como PWA nativa con su icono verde y barras estilizadas.
* **En Android (Chrome)**: Te aparecerá un banner inferior o puedes pulsar en los tres puntos superiores y seleccionar **"Instalar aplicación"**.
