const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

let comments = [];
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

    return totalRatings > 0 ? (totalRating / totalRatings).toFixed(1) : 0;
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
    const { text, rating } = req.body;
    if (text && typeof rating === 'number' && rating >= 1 && rating <= 5) {
        comments.push({ text, rating });

        // Update rating counts
        if (ratingCounts[rating] !== undefined) {
            ratingCounts[rating]++;
        }

        res.status(201).json({ message: 'Comment added!' });
    } else {
        res.status(400).json({ message: 'Invalid comment data' });
    }
});

// Delete a comment by index
app.delete('/comments/:index', (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (!isNaN(index) && index >= 0 && index < comments.length) {
        const removedComment = comments.splice(index, 1)[0];

        // Update rating counts
        if (removedComment && ratingCounts[removedComment.rating] !== undefined) {
            ratingCounts[removedComment.rating]--;
        }

        res.status(200).json({ message: 'Comment deleted!' });
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
