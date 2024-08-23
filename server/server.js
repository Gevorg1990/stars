const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// Uncomment and adjust the origin to match your deployment
app.use(cors({
    // origin: 'https://gevorg1990.github.io', // Replace with your production URL
    origin: '*', // Allow all origins for local development
}));

let comments = [];
let globalRating = 5; // Default global rating
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

// Get all comments, global rating, and average rating
app.get('/comments', (req, res) => {
    res.json({
        comments,
        globalRating,
        ratingCounts: Object.values(ratingCounts),
        averageRating: calculateAverageRating()
    });
});

// Add a new comment
app.post('/comments', (req, res) => {
    const { text, rating = 5, userId } = req.body; // Default rating to 5 if not provided
    if (text && typeof rating === 'number' && rating >= 1 && rating <= 5 && userId) {
        const newComment = { text, rating, userId, id: uuidv4() };
        comments.push(newComment);

        // Update rating counts
        if (ratingCounts[rating] !== undefined) {
            ratingCounts[rating]++;
        }

        // Recalculate global rating
        globalRating = calculateAverageRating();

        res.status(201).json({ message: 'Comment added!', comment: newComment });
    } else {
        res.status(400).json({ message: 'Invalid comment data' });
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
                // Ensure rating count doesn't go negative
                if (ratingCounts[removedComment.rating] < 0) {
                    ratingCounts[removedComment.rating] = 0;
                }
            }

            // Recalculate global rating
            globalRating = calculateAverageRating();

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
