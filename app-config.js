'use strict';

const VERSION='0.2.0-pass2-chat';
const KEYS={
  state:'civweave.chat.state.v1',
  transcript:'civweave.chat.transcript.v1',
  peers:'civweave.chat.peers.v1',
  creator:'civweave.chat.creator.v1',
  settings:'civweave.chat.settings.v1',
  inbox:'civweave.realm-inbox.v1',
  working:'civweave.working-campus.v1',
  rewards:'civweave.chat.rewards.v1',
  records:'civweave.chat.records.v1',
  sessions:'civweave.node-ai-marketplace.sessions.v1',
  validations:'civweave.chat.validations.v2',
  pairingInbox:'civweave.chat.pairing-inbox.v2',
  addons:'civweave.chat.addons.v1'
};

const GUIDES={
  weaveling:{name:'Weaveling',emoji:'🧭',trinket:'Compass',role:'orchestrator',prompt:'Mirror the user’s intention, coordinate the other guides, preserve review gates, and make the next useful move obvious.'},
  moss:{name:'Moss',emoji:'🌰',trinket:'Acorn',role:'learning',prompt:'Turn the intention into learnable skills, evidence, practice, and competency checkpoints.'},
  kamiya:{name:'Kamiya',emoji:'🎁',trinket:'Gift',role:'work',prompt:'Turn the intention into skilled work, quests, submissions, evidence, and validated completion.'},
  rook:{name:'Rook',emoji:'🔘',trinket:'Button',role:'exchange',prompt:'Help find materials, services, agreements, prices, fair edges, and resource exchange.'},
  merlin:{name:'Merlin',emoji:'🧙',trinket:'Wizard hat',role:'governance',prompt:'Handle consent, roles, proposals, validation rules, disputes, review, and shared-state changes.'}
};

const TOOLS=[
  ['wish','🧭 Wish','Create or inspect the active weave'],
  ['learn','🌰 Learn','Learning paths and competency'],
  ['work','🎁 Work','Quests, evidence and rewards'],
  ['market','🔘 Market','Services, materials and agreements'],
  ['govern','🧙 Govern','Consent, proposals and validation'],
  ['validate','✓ Validate','Weighted confidence and payout gates'],
  ['wallet','💳 Wallet','Hosted AI balance and node credit'],
  ['nodes','📡 Nodes','Nearby peer minimap and pairing'],
  ['creator','🪪 Creator card','Edit your paid-service advert'],
  ['downloads','⬇ Downloads','Optional storage-heavy add-ons'],
  ['records','🗃 Records','All local feature records'],
  ['settings','⚙ Settings','AI, host and privacy'],
  ['export','↗ Export','Portable local backup']
];

const ADDONS=[
  {
    id:'tiny-router',
    name:'Tiny Router LM',
    description:'Recommended for everyone. Civweave’s existing SmolLM2 360M Instruct route-lock model, downloaded only when requested, for local routing and short guide turns without relying on deterministic keyword rules.',
    modelId:'HuggingFaceTB/SmolLM2-360M-Instruct',
    modelCandidates:['onnx-community/SmolLM2-360M-Instruct-ONNX','HuggingFaceTB/SmolLM2-360M-Instruct'],
    approxBytes:272737275,
    runtime:'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.7.2/+esm',
    required:false,
    recommended:true
  }
];
