import { model, Schema } from 'mongoose';

const collectorSchema = new Schema(
	{
		domain: { type: String, required: true, unique: true, index: true },
		collectorId: { type: String, required: true, unique: true },
		status: { type: String, required: true, default: 'ready' },
	},
	{ timestamps: true }
);



export const CollectorModel = model('Collector', collectorSchema);
