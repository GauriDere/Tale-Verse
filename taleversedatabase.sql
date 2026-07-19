CREATE DATABASE taleversedatabase;
USE taleversedatabase;

CREATE TABLE taleverse_books (
    id INT AUTO_INCREMENT PRIMARY KEY,
    book_name VARCHAR(255) NOT NULL,
    author_name VARCHAR(255) NOT NULL,
    book_price DECIMAL(10,2) NOT NULL,
    book_photo VARCHAR(500),
    category VARCHAR(100),
    ratings DECIMAL(2,1),
    edition VARCHAR(50),
    format VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);