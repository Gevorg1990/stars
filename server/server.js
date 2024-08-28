const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(cors({ origin: '*' }));

const commentsFilePath = path.join(__dirname, 'comments.json');
const uploadsDir = path.join(__dirname, '..', 'uploads');

// Load comments from file
let comments = [];
if (fs.existsSync(commentsFilePath)) {
    const commentsData = fs.readFileSync(commentsFilePath, 'utf8');
    comments = JSON.parse(commentsData);
}

let globalRating = 5;
let ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

// Calculate the average rating
function calculateAverageRating() {
    let totalRating = 0;
    let totalRatings = 0;

    for (const [rating, count] of Object.entries(ratingCounts)) {
        totalRating += parseInt(rating) * count;
        totalRatings += count;
    }

    return totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : '0.0';
}

// Initialize rating counts based on current comments
comments.forEach(comment => {
    if (ratingCounts[comment.rating] !== undefined) {
        ratingCounts[comment.rating]++;
    }
});

// Save comments to file
function saveCommentsToFile() {
    fs.writeFileSync(commentsFilePath, JSON.stringify(comments, null, 2));
}

// Ensure uploads directory exists
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ storage });

// Serve static files from the "uploads" directory
app.use('/uploads', express.static(uploadsDir));

// Get all comments, global rating, and average rating
app.get('/comments', (req, res) => {
    res.json({
        comments,
        globalRating,
        ratingCounts: Object.values(ratingCounts),
        averageRating: calculateAverageRating()
    });
});

// Handle POST requests to /comments
app.post('/comments', upload.single('avatar'), (req, res) => {

    try {
        const { text, rating, userId, name } = req.body;
        const avatarUrl = req.file ? `/uploads/${req.file.filename}` : req.body.avatar;

        const numericRating = Number(rating);

        if (text && !isNaN(numericRating) && numericRating >= 1 && numericRating <= 5 && userId) {
            const newComment = {
                text,
                rating: numericRating,
                userId,
                name,
                avatar: avatarUrl,
                id: uuidv4(),
                date: new Date().toISOString()
            };
            comments.push(newComment);

            if (ratingCounts[newComment.rating] !== undefined) {
                ratingCounts[newComment.rating]++;
            }

            globalRating = parseFloat(calculateAverageRating());

            saveCommentsToFile();

            res.status(201).json({ message: 'Comment added!', comment: newComment });
        } else {
            res.status(400).json({ message: 'Invalid comment data', data: req.body });
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
});

// Delete a comment by ID
app.delete('/comments/:id', (req, res) => {
    const commentId = req.params.id;
    const { userId } = req.body;

    const index = comments.findIndex(comment => comment.id === commentId);
    if (index !== -1) {
        const comment = comments[index];
        if (comment.userId === userId) {
            const removedComment = comments.splice(index, 1)[0];

            // Update rating counts
            if (removedComment && ratingCounts[removedComment.rating] !== undefined) {
                ratingCounts[removedComment.rating]--;
                if (ratingCounts[removedComment.rating] < 0) {
                    ratingCounts[removedComment.rating] = 0;
                }
            }

            // Recalculate global rating
            globalRating = parseFloat(calculateAverageRating());

            saveCommentsToFile();

            res.status(200).json({ message: 'Comment deleted!' });
        } else {
            res.status(403).json({ message: 'Unauthorized to delete this comment' });
        }
    } else {
        res.status(404).json({ message: 'Comment not found' });
    }
});

// Set global rating
app.post('/global-rating', (req, res) => {
    const { rating } = req.body;
    if (typeof rating === 'number' && rating >= 1 && rating <= 5) {
        globalRating = rating;

        res.status(200).json({ message: 'Global rating updated!' });
    } else {
        res.status(400).json({ message: 'Invalid rating' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
