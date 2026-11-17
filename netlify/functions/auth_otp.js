
const crypto = require('node:crypto');
const { sign, verify, reply } = require('./_security');

// Correos autorizados
const emails = () => new Set(
  (process.env.AUTHORIZED_EMAILS || '')
    .split(/[,;|]/)
    .map(x => x.trim().toLowerCase())
    .filter(Boolean)
);

// Enviar código OTP mediante EmailJS
async function enviarOTPEmailJS(destinatario, codigo) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error('Faltan variables de configuración de EmailJS');
  }

  const response = await fetch(
    'https://api.emailjs.com/api/v1.0/email/send',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        accessToken: privateKey,
        template_params: {
          to_email: destinatario,
          email: destinatario,
          otp_code: codigo,
          logo_url:
            'https://leydeinternos.netlify.app/brand/Code_Generated_Image.png'
        }
      })
    }
  );

  if (!response.ok) {
    const error = await response.text();

    console.error(
      'EmailJS error:',
      response.status,
      error
    );

    throw new Error(
      `No fue posible enviar el correo OTP (EmailJS ${response.status})`
    );
  }

  return true;
}

// Función principal de Netlify
exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return reply(405, { error: 'Método no permitido' });
  }

  let body;

  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return reply(400, { error: 'JSON inválido' });
  }

  const email = String(body.email || '')
    .trim()
    .toLowerCase();

  if (!emails().has(email)) {
    return reply(403, { error: 'Correo no autorizado' });
  }

  try {
    // SOLICITAR CÓDIGO OTP
    if (body.action === 'request_code') {
      const code = crypto
        .randomInt(0, 1000000)
        .toString()
        .padStart(6, '0');

      const challenge = sign({
        type: 'otp',
        email,
        hash: crypto
          .createHash('sha256')
          .update(
            email + ':' + code + ':' +
            process.env.OTP_SECRET_KEY
          )
          .digest('hex'),
        exp: Date.now() + 10 * 60 * 1000
      });

      // Envío por EmailJS en lugar de SMTP
      await enviarOTPEmailJS(email, code);

      return reply(200, {
        message: 'Código enviado',
        challenge
      });
    }

    // VERIFICAR CÓDIGO OTP
    if (body.action === 'verify_code') {
      const p = verify(body.challenge);
      const code = String(body.code || '');

      if (
        !p ||
        p.type !== 'otp' ||
        p.email !== email ||
        !/^[0-9]{6}$/.test(code) ||
        typeof p.hash !== 'string' ||
        !/^[a-f0-9]{64}$/.test(p.hash)
      ) {
        return reply(401, {
          error: 'Código inválido o expirado'
        });
      }

      const hash = crypto
        .createHash('sha256')
        .update(
          email + ':' + code + ':' +
          process.env.OTP_SECRET_KEY
        )
        .digest('hex');

      if (
        !crypto.timingSafeEqual(
          Buffer.from(hash, 'hex'),
          Buffer.from(p.hash, 'hex')
        )
      ) {
        return reply(401, {
          error: 'Código incorrecto'
        });
      }

      return reply(200, {
        authenticated: true,
        token: sign({
          type: 'session',
          email,
          exp: Date.now() + 8 * 3600 * 1000
        }),
        expires_at:
          Math.floor(Date.now() / 1000) + 28800,
        email
      });
    }

    return reply(400, {
      error: 'Acción no válida'
    });

  } catch (e) {
    console.error('OTP error', e.message);

    return reply(500, {
      error: 'Error de configuración o envío de correo'
    });
  }
};
