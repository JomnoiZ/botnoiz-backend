import bodyParser from 'body-parser';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';
import express from 'express';
import moment from 'moment';
import 'moment-timezone';
import mongoose from 'mongoose';
import apService from './services/ap.service';
import defaultRoutes from './routes/default.routes';
import errorRoutes from './routes/error.routes';
import userRoutes from './routes/user.routes';
import helmet from 'helmet';
import apRoutes from './routes/ap.routes';
import webhookRoutes from './routes/webhook.routes';

dotenv.config();

const app = express();

moment.tz.setDefault('Asia/Bangkok');

mongoose
    .connect(
        `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@${process.env.MONGO_CLUSTER}.5urko2y.mongodb.net/?retryWrites=true&w=majority`
    )
    .then(() => {
        console.log('Database connected ');
    })
    .catch((err) => {
        console.log('Database connection error');
        console.log(err);
    });

cron.schedule('* * * * *', () => {
    // console.log('checking active slots');
    apService.multicastAnnounceSlots();
});

// cron.schedule('*/20 * * * *', async () => {
//     console.log('syncing google sheet');
//     await apService.syncSheet(process.env.SHEET_NAME!);
// });

app.use(cors());
app.use('/webhook', webhookRoutes);
app.use(helmet());
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/', defaultRoutes);
app.use('/ap', apRoutes);
app.use('/user', userRoutes);
app.use(errorRoutes);

app.listen(process.env.PORT, () => {
    console.log(`Server running on port ${process.env.PORT}`);
});
