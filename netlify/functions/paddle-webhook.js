exports.handler = async function (event) {
  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: 'Method not allowed'
      };
    }

    const body = JSON.parse(event.body);

    if (body.event_type !== 'transaction.completed') {
      return {
        statusCode: 200,
        body: 'Event ignored'
      };
    }

    const transaction = body.data;
    const customData = transaction.custom_data || {};

    const email = customData.supabase_email;
    const plan = customData.plan;

    if (!email || !plan) {
      return {
        statusCode: 400,
        body: 'Missing email or plan'
      };
    }

    var maxPrints = null;
    var expiresAt = new Date();

    if (plan === 'one_offer') {
      maxPrints = 1;
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    if (plan === 'monthly') {
      maxPrints = null;
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    if (plan === 'lifetime' || plan === 'yearly') {
  maxPrints = null;
  expiresAt.setFullYear(expiresAt.getFullYear() + 1);
}

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const response = await fetch(supabaseUrl + '/rest/v1/subscriptions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': 'Bearer ' + serviceRoleKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({
  email: email,
  plan: plan === 'lifetime' ? 'yearly' : plan,
  status: 'active',
  starts_at: new Date().toISOString(),
  expires_at: expiresAt.toISOString(),
  used_prints: 0,
  max_prints: maxPrints,
  paddle_transaction_id: transaction.id || null,
  paddle_subscription_id: transaction.subscription_id || null
})
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log('Supabase error:', errorText);

      return {
        statusCode: 500,
        body: 'Supabase insert error: ' + errorText
      };
    }

    return {
      statusCode: 200,
      body: 'Subscription activated'
    };

  } catch (err) {
    console.log('Webhook error:', err);

    return {
      statusCode: 500,
      body: 'Webhook error'
    };
  }
};
