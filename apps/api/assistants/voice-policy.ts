/**
 * Defines the shared voice completion policy and Retell's native call-control action.
 * Dependencies: none. Used by runtime config and protected Retell releases.
 * Why: saying goodbye alone does not disconnect a Retell phone call.
 */
export const VOICE_COMPLETION_PROMPT =
  'When the caller says goodbye, asks to end the call, or confirms they need nothing else, invoke end_call. After completing the requested work, summarize only verified results and ask once whether they need anything else. If they say no, invoke end_call instead of asking another question or waiting for them to hang up. The end_call tool speaks the farewell; do not announce its name or duplicate the farewell. Continue helping if the caller has another question.';

export const RETELL_END_CALL_TOOL = {
  type: 'end_call',
  name: 'end_call',
  description:
    'End the call when the caller says goodbye, asks to end, or confirms they are finished. Do not end merely because they thank you while continuing their request.',
  speak_during_execution: true,
  execution_message_type: 'static_text',
  execution_message_description: 'Thanks for calling Justin LeBlanc. Goodbye!',
} as const;
