package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"wedding-invitation/config"
	"wedding-invitation/hub"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/joho/godotenv"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allowing all origins for this project
	},
}

var serverHub *hub.Hub

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Println("Error loading .env file")
	}

	config.ConnectDB()
	config.InitDB() // Ensure tables exist
	serverHub = hub.NewHub()
	go serverHub.Run()

	r := gin.Default()

	// CORS Middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	})

	// Static files
	r.Static("/static", "./static")
	r.Static("/assets", "./frontend/dist/assets") // For production build
	r.LoadHTMLGlob("static/*.html")

	// Routes
	r.GET("/", func(c *gin.Context) {
		c.HTML(http.StatusOK, "index.html", gin.H{
			"title": "The Wedding of Izzet & Kezia",
		})
	})

	r.GET("/ws", func(c *gin.Context) {
		serveWs(c.Writer, c.Request)
	})

	// Chat history API
	r.GET("/api/messages", func(c *gin.Context) {
		rows, err := config.DB.Query(c.Request.Context(), "SELECT guest_name, content, created_at FROM messages ORDER BY created_at DESC LIMIT 50")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		defer rows.Close()

		var messages []gin.H
		for rows.Next() {
			var name, content string
			var createdAt interface{}
			rows.Scan(&name, &content, &createdAt)
			messages = append(messages, gin.H{
				"guest_name": name,
				"content":    content,
				"timestamp":  createdAt,
			})
		}
		c.JSON(http.StatusOK, messages)
	})

	// RSVP API
	r.POST("/api/rsvp", func(c *gin.Context) {
		var input struct {
			Name     string `json:"name"`
			Attend   bool   `json:"attend"`
			Quantity int    `json:"quantity"`
			Note     string `json:"note"`
		}
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}

		_, err := config.DB.Exec(c.Request.Context(), 
			"INSERT INTO rsvps (guest_name, attending, total_persons, note) VALUES ($1, $2, $3, $4)",
			input.Name, input.Attend, input.Quantity, input.Note)
		
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"message": "RSVP Sent!"})
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server started on port %s", port)
	r.Run(":" + port)
}

func serveWs(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	serverHub.Register(conn)

	defer func() {
		serverHub.Unregister(conn)
	}()

	for {
		var msg hub.Message
		err := conn.ReadJSON(&msg)
		if err != nil {
			log.Printf("error: %v", err)
			break
		}
		// Broadcast to all clients
		serverHub.Broadcast(msg)

		// Save to NeonDB
		_, err = config.DB.Exec(context.Background(), 
			"INSERT INTO messages (guest_name, content, created_at) VALUES ($1, $2, NOW())",
			msg.GuestName, msg.Content)
		if err != nil {
			log.Printf("DB error: %v", err)
		}
	}
}
