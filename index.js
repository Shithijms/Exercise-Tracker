const express = require('express');
const cors = require('cors');
require('dotenv').config({ path: './sample.env' });
const mongoose = require('mongoose');

const app = express();
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: false }));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

async function main() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to MongoDB");

    // Schema
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true },
    });

    const exerciseSchema = new mongoose.Schema({
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: Date },
    });

    // Model
    const User = mongoose.model('User', userSchema);
    const Exercise = mongoose.model('Exercise', exerciseSchema);

    // Routes
    app.post('/api/users', async (req, res) => {
      const user = new User({ username: req.body.username });
      await user.save();
      res.json({ username: user.username, _id: user._id });
    });

    app.get('/api/users', async (req, res) => {
      const users = await User.find({}, 'username _id');
      res.json(users);
    });

    app.post('/api/users/:_id/exercises', async (req, res) => {
      const { description, duration, date } = req.body;
      const user = await User.findById(req.params._id);
      if (!user) return res.status(404).send('User not found');

      const exercise = new Exercise({
        userId: user._id,
        description,
        duration: parseInt(duration),
        date: date ? new Date(date) : new Date(),
      });

      await exercise.save();

      res.json({
        username: user.username,
        description: exercise.description,
        duration: exercise.duration,
        date: exercise.date.toDateString(),
        _id: user._id
      });
    });

    app.get('/api/users/:_id/logs', async (req, res) => {
      const { from, to, limit } = req.query;
      const user = await User.findById(req.params._id);
      if (!user) return res.status(404).send('User not found');

      const query = { userId: user._id };
      if (from || to) query.date = {};
      if (from) query.date.$gte = new Date(from);
      if (to) query.date.$lte = new Date(to);

      const exercises = await Exercise.find(query).limit(+limit || 500);
      const formattedLog = exercises.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      }));

      res.json({
        username: user.username,
        count: formattedLog.length,
        _id: user._id,
        log: formattedLog
      });
    });

    // Start server AFTER connection established
    const listener = app.listen(process.env.PORT || 3000, () => {
      console.log('Your app is listening on port ' + listener.address().port);
    });

  } catch (err) {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  }
}

main();
