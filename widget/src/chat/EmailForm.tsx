import { useId, useState, type FormEvent } from 'react';
import type { EmailStatus } from './types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

interface Props {
  status: EmailStatus;
  onSubmit: (email: string) => void;
}

/** Inline field shown under an escalated answer, so a human advisor can reply. */
export function EmailForm({ status, onSubmit }: Props) {
  const [email, setEmail] = useState('');
  const [touched, setTouched] = useState(false);
  const inputId = useId();
  const hintId = useId();
  const valid = EMAIL_PATTERN.test(email.trim());

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setTouched(true);
    if (valid && status !== 'sending') onSubmit(email.trim());
  }

  const hint =
    touched && !valid
      ? 'Veuillez saisir une adresse e-mail valide, par exemple nom@exemple.fr.'
      : status === 'error'
        ? "L'envoi n'a pas abouti. Vous pouvez réessayer."
        : 'Un conseiller vous répondra à cette adresse sous 2 jours ouvrés.';

  return (
    <form className="mn-email" onSubmit={handleSubmit} noValidate>
      <label htmlFor={inputId} className="mn-email__label">
        Votre adresse e-mail
      </label>
      <div className="mn-email__row">
        <input
          id={inputId}
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          placeholder="nom@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setTouched(true)}
          aria-invalid={touched && !valid}
          aria-describedby={hintId}
          disabled={status === 'sending'}
        />
        <button type="submit" disabled={status === 'sending'}>
          {status === 'sending' ? 'Envoi…' : 'Envoyer'}
        </button>
      </div>
      <p id={hintId} className={`mn-email__hint${(touched && !valid) || status === 'error' ? ' mn-email__hint--error' : ''}`}>
        {hint}
      </p>
    </form>
  );
}
