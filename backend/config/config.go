package config

import "os"

type Config struct {
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	JWTSecret  string
	ServerPort string
	UploadDir  string
}

func Load() *Config {
	return &Config{
		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "revista"),
		DBPassword: getEnv("DB_PASSWORD", "revista123"),
		DBName:     getEnv("DB_NAME", "revista_db"),
		JWTSecret:  getEnv("JWT_SECRET", "revista-secret-key-change-in-production"),
		ServerPort: getEnv("SERVER_PORT", "8080"),
		UploadDir:  getEnv("UPLOAD_DIR", "uploads"),
	}
}

func (c *Config) DatabaseURL() string {
	return "postgres://" + c.DBUser + ":" + c.DBPassword + "@" + c.DBHost + ":" + c.DBPort + "/" + c.DBName + "?sslmode=disable"
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}
