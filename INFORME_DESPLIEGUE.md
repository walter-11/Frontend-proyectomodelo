# Informe Técnico de Despliegue y Persistencia de Datos

Este informe detalla el proceso paso a paso para el despliegue del backend en **Render** (con base de datos en memoria H2) y del frontend en **Vercel**, así como la configuración de persistencia e inicialización automática de datos.

---

## 1. Arquitectura del Proyecto

El sistema está diseñado bajo una arquitectura desacoplada:

```
[ Frontend: Angular ]  ──(Peticiones HTTPS con CORS)──>  [ Backend: Spring Boot ]
      (En Vercel)                                              (En Render)
                                                                    │
                                                           (JPA Hibernate Auto)
                                                                    ▼
                                                         [ Base de Datos H2 ]
                                                             (En memoria)
```

*   **Frontend:** Aplicación Angular compilada de forma estática y desplegada en **Vercel**.
*   **Backend:** API REST de Spring Boot empaquetada en un contenedor Docker y desplegada en **Render**.
*   **Persistencia:** Base de datos relacional **H2** en memoria con persistencia de ciclo de vida del servidor (DB_CLOSE_DELAY).

---

## 2. Configuración del Backend (Spring Boot + H2)

### A. Dependencias (`pom.xml`)
Se integró **H2 Database** y **Springdoc OpenAPI (Swagger)**, manteniendo la dependencia de MySQL comentada como alternativa:

*   **H2 Database:** Para persistencia temporal.
*   **Swagger UI:** Para documentar y probar los endpoints interactivamente.

### B. Configuración de Propiedades (`application.properties`)
Se configuró la base de datos H2 con las siguientes propiedades clave:

```properties
# H2 en memoria con retardo de cierre para evitar pérdida de datos entre conexiones
spring.datasource.url=jdbc:h2:mem:marketdb;DB_CLOSE_DELAY=-1
spring.datasource.driver-class-name=org.h2.Driver
spring.datasource.username=sa
spring.datasource.password=

# Hibernate: Creación y mapeo automático de tablas
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# Habilitar la consola web de H2
spring.h2.console.enabled=true

# Diferir la inicialización para que data.sql se ejecute después de crear las tablas
spring.jpa.defer-datasource-initialization=true

# Puerto dinámico asignado por Render (por defecto 8080)
server.port=${PORT:8080}
```

### C. Inicialización de Datos de Prueba (`data.sql`)
Se creó el archivo `src/main/resources/data.sql` para poblar la base de datos automáticamente con categorías y productos al iniciar la aplicación:

```sql
INSERT INTO categorias (descripcion, estado) VALUES ('Tecnología', true);
INSERT INTO categorias (descripcion, estado) VALUES ('Hogar', true);
INSERT INTO categorias (descripcion, estado) VALUES ('Deportes', true);

INSERT INTO productos (nombre, id_categoria, codigo_barras, precio_venta, cantidad_stock, estado) 
VALUES ('Teclado Mecánico RGB', 1, '123456789012', 49.99, 15, true);
-- (más registros en el código fuente...)
```

### D. Resolución de Inconsistencia Crítica (Bug de Persistencia)
*   **Problema:** La clase `Producto.java` tenía declarada la llave primaria `idProducto` como un `String` usando `@GeneratedValue(strategy = GenerationType.IDENTITY)`. H2 y la mayoría de bases de datos relacionales no soportan autoincrementales en campos de texto, provocando un fallo silencioso que impedía crear la tabla.
*   **Solución:** Se corrigió el tipo de dato de `idProducto` a `Integer` en `Producto.java` y sus métodos de acceso. Esto permitió a Hibernate crear las tablas con éxito y a `data.sql` poblar la base de datos.

---

## 3. Despliegue del Backend en Render (Vía Docker)

Para garantizar un entorno reproducible, se utilizó **Docker** para empaquetar el backend de Spring Boot.

### A. Dockerfile (Multi-stage Build)
Se creó un `Dockerfile` optimizado en la raíz del backend:

```dockerfile
# Etapa 1: Compilación del proyecto con Maven y JDK 21
FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Etapa 2: Imagen ligera de ejecución (JRE 21)
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 10000
ENTRYPOINT ["java", "-jar", "app.jar"]
```

### B. Pasos en Render:
1.  Crear una cuenta en [Render.com](https://render.com/) y conectar GitHub.
2.  Hacer clic en **New +** > **Web Service**.
3.  Seleccionar el repositorio del backend (`ProyectoModelo`).
4.  Configurar la aplicación:
    *   **Name:** `proyecto-modelo-backend`
    *   **Language:** `Docker` (Render buscará el `Dockerfile` automáticamente).
    *   **Instance Type:** `Free`.
5.  Hacer clic en **Create Web Service** y esperar a que el log muestre:
    `Tomcat started on port(s): 8080 (http) with context path '/market/api'`

---

## 4. Despliegue del Frontend en Vercel

### A. Configuración de API de Producción
En el archivo `src/app/services/product.service.ts`, se modificó la URL base para que apunte al servidor desplegado en Render:

```typescript
private apiUrl = 'https://proyecto-modelo-backend.onrender.com/market/api/products';
```

### B. Configuración de Redirección (`vercel.json`)
Dado que Angular es una Single Page Application (SPA), se configuró `vercel.json` en la raíz del frontend para evitar errores 404 al recargar páginas internas:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### C. Pasos en Vercel:
1.  Ingresar a [Vercel.com](https://vercel.com/) y conectar GitHub.
2.  Importar el proyecto del frontend (`Frontend-proyectomodelo`).
3.  Vercel detectará el framework (Angular). Dejar el comando de compilación por defecto (`ng build`).
4.  Hacer clic en **Deploy**. Al terminar, Vercel proveerá una URL pública (ej. `https://proyecto-modelo-frontend.vercel.app`).

---

## 5. Guía de Capturas de Pantalla Recomendadas para el Informe

Para documentar correctamente tu entrega, te sugiero tomar e integrar las siguientes capturas de pantalla:

### 📸 Captura 1: Estructura del Backend (Visual Studio Code o IntelliJ)
*   **Qué mostrar:** La estructura de carpetas abierta, mostrando el archivo `Dockerfile` en la raíz y el archivo `data.sql` dentro de `src/main/resources/`.
*   **Propósito:** Demuestra la arquitectura limpia y la configuración del entorno en memoria H2.

### 📸 Captura 2: Consola de Render (Deploy Exitoso)
*   **Qué mostrar:** El panel de logs de Render mostrando el mensaje de arranque exitoso de Spring Boot:
    `Tomcat started on port 8080 (http) with context path '/market/api'` y el estado **"Live"** en verde en Render.
*   **Propósito:** Prueba que el servidor de Spring Boot se construyó y levantó correctamente como un contenedor Docker en la nube.

### 📸 Captura 3: Interfaz de Swagger UI en Producción
*   **Qué mostrar:** Tu navegador web con la URL `https://tu-api.onrender.com/market/api/swagger-ui/index.html` abierta, mostrando la lista de endpoints.
*   **Propósito:** Demuestra que la API expone correctamente sus servicios al público y Swagger está integrado.

### 📸 Captura 4: Prueba de Endpoint (`/products/all`) con Datos
*   **Qué mostrar:** El navegador (o Postman/Swagger) consumiendo `https://tu-api.onrender.com/market/api/products/all` y retornando la estructura JSON con los productos creados por `data.sql`.
*   **Propósito:** Prueba que la inserción de datos iniciales en H2 se realizó de forma correcta y la base de datos está respondiendo peticiones HTTP.

### 📸 Captura 5: Vercel Dashboard (Deploy del Frontend)
*   **Qué mostrar:** El panel de Vercel mostrando el estado **"Ready"** y la URL asignada a tu frontend en Angular.
*   **Propósito:** Demuestra el despliegue del cliente de Angular en servidores estáticos de Vercel.

### 📸 Captura 6: Aplicación en Angular consumiendo datos de Render
*   **Qué mostrar:** La página de tu aplicación corriendo en producción en Vercel, mostrando las tarjetas de los productos con sus precios y categorías que provienen del servidor de Render.
*   **Propósito:** Evidencia final de que la integración extremo a extremo (Frontend Angular en Vercel -> Backend Spring Boot en Render -> Base de datos H2) funciona perfectamente.
