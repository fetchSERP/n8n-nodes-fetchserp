import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';

interface ToolConfig {
	method: 'GET' | 'POST';
	endpoint: string;
	requiresBody?: boolean;
}

// Mapping of operation names to endpoint config
const TOOL_MAP: Record<string, ToolConfig> = {
	get_backlinks: { method: 'GET', endpoint: '/api/v1/backlinks' },
	get_domain_emails: { method: 'GET', endpoint: '/api/v1/domain_emails' },
	get_domain_info: { method: 'GET', endpoint: '/api/v1/domain_infos' },
	get_keywords_search_volume: { method: 'GET', endpoint: '/api/v1/keywords_search_volume' },
	get_keywords_suggestions: { method: 'GET', endpoint: '/api/v1/keywords_suggestions' },
	get_long_tail_keywords: { method: 'GET', endpoint: '/api/v1/long_tail_keywords_generator' },
	get_moz_analysis: { method: 'GET', endpoint: '/api/v1/moz' },
	check_page_indexation: { method: 'GET', endpoint: '/api/v1/page_indexation' },
	get_domain_ranking: { method: 'GET', endpoint: '/api/v1/ranking' },
	scrape_webpage: { method: 'GET', endpoint: '/api/v1/scrape' },
	scrape_domain: { method: 'GET', endpoint: '/api/v1/scrape_domain' },
	scrape_webpage_js: { method: 'POST', endpoint: '/api/v1/scrape_js', requiresBody: true },
	scrape_webpage_js_proxy: { method: 'POST', endpoint: '/api/v1/scrape_js_with_proxy', requiresBody: true },
	get_serp_results: { method: 'GET', endpoint: '/api/v1/serp' },
	get_serp_html: { method: 'GET', endpoint: '/api/v1/serp_html' },
	get_serp_ai_mode: { method: 'GET', endpoint: '/api/v1/serp_ai_mode' },
	get_serp_text: { method: 'GET', endpoint: '/api/v1/serp_text' },
	get_user_info: { method: 'GET', endpoint: '/api/v1/user' },
	get_webpage_ai_analysis: { method: 'GET', endpoint: '/api/v1/web_page_ai_analysis' },
	get_webpage_seo_analysis: { method: 'GET', endpoint: '/api/v1/web_page_seo_analysis' },
};

export class FetchSerp implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'FetchSERP',
		name: 'fetchSerp',
		icon: 'fa:search',
		group: ['transform'],
		version: 1,
		description: 'Interact with the FetchSERP API',
		defaults: {
			name: 'FetchSERP',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		usableAsTool: true,
		credentials: [
			{
				name: 'fetchserpApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Check Page Indexation', value: 'check_page_indexation' },
					{ name: 'Get Backlinks', value: 'get_backlinks' },
					{ name: 'Get Domain Emails', value: 'get_domain_emails' },
					{ name: 'Get Domain Info', value: 'get_domain_info' },
					{ name: 'Get Domain Ranking', value: 'get_domain_ranking' },
					{ name: 'Get Keywords Search Volume', value: 'get_keywords_search_volume' },
					{ name: 'Get Keywords Suggestions', value: 'get_keywords_suggestions' },
					{ name: 'Get Long Tail Keywords', value: 'get_long_tail_keywords' },
					{ name: 'Get Moz Analysis', value: 'get_moz_analysis' },
					{ name: 'Get SERP AI Mode', value: 'get_serp_ai_mode' },
					{ name: 'Get SERP HTML', value: 'get_serp_html' },
					{ name: 'Get SERP Results', value: 'get_serp_results' },
					{ name: 'Get SERP Text', value: 'get_serp_text' },
					{ name: 'Get User Info', value: 'get_user_info' },
					{ name: 'Get Webpage AI Analysis', value: 'get_webpage_ai_analysis' },
					{ name: 'Get Webpage SEO Analysis', value: 'get_webpage_seo_analysis' },
					{ name: 'Scrape Domain', value: 'scrape_domain' },
					{ name: 'Scrape Webpage', value: 'scrape_webpage' },
					{ name: 'Scrape Webpage JS', value: 'scrape_webpage_js' },
					{ name: 'Scrape Webpage JS & Proxy', value: 'scrape_webpage_js_proxy' },
				],
				default: 'get_backlinks',
			},
			{
				displayName: 'Query Parameters (JSON)',
				name: 'parameters',
				type: 'json',
				default: '{}',
				description: 'Query parameters as JSON (e.g. {"domain":"example.com"})',
			},
			{
				displayName: 'Request Body (JSON)',
				name: 'body',
				type: 'json',
				default: '{}',
				description: 'Body for POST operations',
				displayOptions: {
					show: {
						operation: ['scrape_webpage_js', 'scrape_webpage_js_proxy'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = (await this.getCredentials('fetchserpApi')) as {
			token: string;
			baseUrl?: string;
		};

		const baseURL = credentials.baseUrl || 'https://www.fetchserp.com';

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;
			const paramsInput = this.getNodeParameter('parameters', i, '{}');
			const bodyInput = this.getNodeParameter('body', i, '{}');

			let params: Record<string, unknown> = {};
			let body: Record<string, unknown> = {};

			if (typeof paramsInput === 'string') {
				params = paramsInput ? JSON.parse(paramsInput) : {};
			} else {
				params = paramsInput as Record<string, unknown>;
			}

			if (typeof bodyInput === 'string') {
				body = bodyInput ? JSON.parse(bodyInput) : {};
			} else {
				body = bodyInput as Record<string, unknown>;
			}

			const config = TOOL_MAP[operation];
			if (!config) {
				throw new NodeOperationError(this.getNode(), `Unknown operation \"${operation}\"`, {
					itemIndex: i,
				});
			}

			const requestOptions: any = {
				method: config.method,
				url: `${baseURL}${config.endpoint}`,
				qs: config.method === 'GET' ? params : undefined,
				body: config.method === 'POST' ? body : undefined,
				headers: {
					Authorization: `Bearer ${credentials.token}`,
					'Content-Type': 'application/json',
				},
				json: true,
			};

			try {
				const responseData = await this.helpers.httpRequest(requestOptions);
				returnData.push({ json: responseData });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
} 