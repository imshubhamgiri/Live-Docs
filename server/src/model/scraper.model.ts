import { Schema, model } from 'mongoose';

const scrapeJobSchema = new Schema(
	{
		id: { type: String, required: true, unique: true, index: true },
		url: { type: String, required: true },
		domain: { type: String, required: true, index: true },
		status: {
			type: String,
			required: true,
			enum: [
				'queued',
				'processing',
				'training_ai_layout',
				'extracting_data',
				'collecting',
				'completed',
				'failed',
			],
		},
		roomId: { type: String, required: true, index: true },
		result: [{ type: Schema.Types.Mixed, default: null }],
		error: { type: String, default: null },
	},
	{ timestamps: true }
);

export const ScrapeJobModel = model('ScrapeJob', scrapeJobSchema);