import createDebugMessages from 'debug';
import { HuggingFaceInference } from '@langchain/community/llms/hf';

import { BaseModel } from '../interfaces/base-model.js';
import { Chunk, Message, ModelResponse } from '../global/types.js';

export class HuggingFace extends BaseModel {
    private readonly debug = createDebugMessages('embedjs:model:HuggingFace');

    private readonly modelName: string;
    private readonly maxNewTokens: number;
    private readonly endpointUrl?: string;
    private model: HuggingFaceInference;

    constructor(params?: { modelName?: string; temperature?: number; maxNewTokens?: number; endpointUrl?: string }) {
        super(params?.temperature);

        this.endpointUrl = params?.endpointUrl;
        this.maxNewTokens = params?.maxNewTokens ?? 300;
        this.modelName = params?.modelName ?? 'mistralai/Mixtral-8x7B-Instruct-v0.1';
    }

    override async init(): Promise<void> {
        this.model = new HuggingFaceInference({
            model: this.modelName,
            maxTokens: this.maxNewTokens,
            temperature: this.temperature,
            endpointUrl: this.endpointUrl,
            verbose: false,
            maxRetries: 1,
        });
    }

    override async runQuery(
        system: string,
        userQuery: string,
        supportingContext: Chunk[],
        pastConversations: Message[],
    ): Promise<ModelResponse> {
        const pastMessages = [system];
        pastMessages.push(`Data: ${supportingContext.map((s) => s.pageContent).join('; ')}`);

        pastMessages.push.apply(
            pastMessages,
            pastConversations.map((c) => {
                if (c.actor === 'AI') return `AI: ${c.content}`;
                else if (c.actor === 'SYSTEM') return `SYSTEM: ${c.content}`;
                else return `HUMAN: ${c.content}`;
            }),
        );

        pastMessages.push(`Question: ${userQuery}?`);
        pastMessages.push('Answer: ');

        const finalPrompt = pastMessages.join('\n');
        // this.debug('Final prompt being sent to HF - ', finalPrompt);
        this.debug(`Executing hugging face '${this.model.model}' model with prompt -`, userQuery);
        const result = await this.model.invoke(finalPrompt);
        this.debug('Hugging response -', result);

        return {
            result,
        };
    }
}
