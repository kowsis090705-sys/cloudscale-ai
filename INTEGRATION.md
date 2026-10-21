# CloudScale AI — Integrated demo
This branch combines the original backend and frontend branches without modifying either source branch.

## Requirements
Java 17+, Node.js compatible with Vite 8, MySQL, Python 3.13 (optional monitoring service).

## Run
1. Configure MySQL and Spring Data JPA in src/main/resources/application.properties (create it if missing). Example settings:
   spring.datasource.url=jdbc:mysql://localhost:3306/cloudscale
   spring.datasource.username=YOUR_USER
   spring.datasource.password=YOUR_PASSWORD
   spring.jpa.hibernate.ddl-auto=update
   spring.jpa.show-sql=true
2. Create the MySQL database: CREATE DATABASE IF NOT EXISTS cloudscale;
3. Start Java backend from repository root: on Windows `mvnw.cmd spring-boot:run` (port 8080).
4. Start the React frontend: `cd frontend`, `npm install`, `npm run dev`. Open http://localhost:5173 .
5. Optional FastAPI metrics: `cd python-service`; install with `pip install -r requirements.txt`; run `uvicorn main:app --reload --port 8000`.

## What was integrated
- Browser frontend calls `/api` via Vite proxy to Spring Boot at localhost:8080.
- Events map backend `title/showTime/price` to frontend presentation.
- Seat booking is **one seat per booking** by design; optimistic locking protects against double booking.
- Booking confirmation and My Bookings read persisted backend bookings; cancelled bookings are displayed with status.
- Admin event creation and deletion match Java endpoints. An event with any booking history cannot be deleted.
- Dashboard currently displays **simulated** autoscaling; FastAPI metrics/analyze endpoints remain available independently. It does NOT create or terminate real cloud instances.

## Important
The backend branch did not contain an application.properties file; configure a database before starting. Adding a price column requires a database schema update (ddl-auto=update in demo).
No payment gateway, authentication or real cloud autoscaling is implemented.
For production, remove permissive CORS, implement authorization, use migrations, and test concurrency.
