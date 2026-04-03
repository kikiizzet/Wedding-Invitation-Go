package config

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/joho/godotenv"
)

var DB *pgxpool.Pool

func ConnectDB() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL not set in .env")
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatal("Unable to parse DATABASE_URL:", err)
	}

	dbPool, err := pgxpool.NewWithConfig(context.Background(), config)
	if err != nil {
		log.Fatal("Unable to connect to database:", err)
	}

	DB = dbPool
	log.Println("Successfully connected to NeonDB!")
}

func InitDB() {
	if DB == nil {
		log.Fatal("DB not connected")
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS messages (
			id SERIAL PRIMARY KEY,
			guest_name VARCHAR(100) NOT NULL,
			content TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
		`CREATE TABLE IF NOT EXISTS rsvps (
			id SERIAL PRIMARY KEY,
			guest_name VARCHAR(100) NOT NULL,
			attending BOOLEAN DEFAULT TRUE,
			total_persons INT DEFAULT 1,
			note TEXT,
			created_at TIMESTAMP DEFAULT NOW()
		)`,
	}

	ctx := context.Background()
	for _, q := range queries {
		_, err := DB.Exec(ctx, q)
		if err != nil {
			log.Fatalf("Error creating table: %v\n", err)
		}
	}
	log.Println("Database tables initialized successfully")
}
