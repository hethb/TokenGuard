export interface ChatPlatform {
  name: string;
  /** Find the active prompt input element. */
  findPromptInput(): HTMLElement | null;
  /** Read prompt text from the input element. */
  readPrompt(input: HTMLElement): string;
  /** Replace the prompt text on the input element with `text`. */
  writePrompt(input: HTMLElement, text: string): void;
  /** Find the send button next to the prompt input. */
  findSendButton(): HTMLElement | null;
  /** Find all assistant message containers currently in the DOM. */
  findAssistantMessages(): HTMLElement[];
  /** Extract markdown/text content from an assistant message. */
  readAssistantText(el: HTMLElement): string;
}

/**
 * ChatGPT (chat.openai.com / chatgpt.com) DOM adapter. Selectors are kept
 * defensive: ChatGPT changes class names frequently, so we prefer ARIA
 * roles and `data-testid` attributes whenever possible.
 */
export const chatgptPlatform: ChatPlatform = {
  name: "ChatGPT",
  findPromptInput() {
    return (
      document.querySelector<HTMLElement>("#prompt-textarea") ??
      document.querySelector<HTMLElement>(
        'textarea[data-id="root"], textarea[placeholder*="Message"]'
      )
    );
  },
  readPrompt(input) {
    if (input instanceof HTMLTextAreaElement) return input.value;
    // ChatGPT sometimes uses a contenteditable ProseMirror element.
    return input.textContent ?? "";
  },
  writePrompt(input, text) {
    if (input instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      )?.set;
      setter?.call(input, text);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      return;
    }
    // contenteditable path — clear children and dispatch input.
    input.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    input.appendChild(p);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  },
  findSendButton() {
    return (
      document.querySelector<HTMLElement>(
        'button[data-testid="send-button"]'
      ) ??
      document.querySelector<HTMLElement>(
        'button[aria-label*="Send" i]:not([disabled])'
      )
    );
  },
  findAssistantMessages() {
    const nodes = document.querySelectorAll<HTMLElement>(
      '[data-message-author-role="assistant"]'
    );
    return Array.from(nodes);
  },
  readAssistantText(el) {
    const md = el.querySelector<HTMLElement>(".markdown, [class*='markdown']");
    return (md ?? el).innerText.trim();
  }
};

/**
 * Claude.ai DOM adapter. Claude uses a ProseMirror-based contenteditable
 * for input and a fairly stable `data-testid="message"` for replies.
 */
export const claudePlatform: ChatPlatform = {
  name: "Claude",
  findPromptInput() {
    return (
      document.querySelector<HTMLElement>(
        'div[contenteditable="true"][data-testid="chat-input"]'
      ) ??
      document.querySelector<HTMLElement>(
        'div[contenteditable="true"].ProseMirror'
      )
    );
  },
  readPrompt(input) {
    return input.innerText ?? "";
  },
  writePrompt(input, text) {
    input.focus();
    input.innerHTML = "";
    const p = document.createElement("p");
    p.textContent = text;
    input.appendChild(p);
    input.dispatchEvent(new InputEvent("input", { bubbles: true }));
  },
  findSendButton() {
    return (
      document.querySelector<HTMLElement>('button[aria-label="Send Message"]') ??
      document.querySelector<HTMLElement>(
        'button[aria-label*="Send" i]:not([disabled])'
      )
    );
  },
  findAssistantMessages() {
    return Array.from(
      document.querySelectorAll<HTMLElement>(
        'div[data-testid="message"]:not([data-from="user"]), div[data-is-streaming], .font-claude-message'
      )
    );
  },
  readAssistantText(el) {
    return el.innerText.trim();
  }
};
