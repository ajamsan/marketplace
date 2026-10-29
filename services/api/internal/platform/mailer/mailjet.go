package mailer

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

// MailjetClient memanggil Mailjet Send API v3.1 langsung via net/http.
type MailjetClient struct {
	apiKey     string
	secret     string
	fromEmail  string
	fromName   string
	httpClient *http.Client
}

func NewMailjet(apiKey, secret, fromEmail, fromName string) *MailjetClient {
	return &MailjetClient{
		apiKey:     apiKey,
		secret:     secret,
		fromEmail:  fromEmail,
		fromName:   fromName,
		httpClient: &http.Client{Timeout: 10 * time.Second},
	}
}

type mjResponse struct {
	Messages []struct {
		Status string `json:"Status"`
		To     []struct {
			MessageID   int64  `json:"MessageID"`
			MessageUUID string `json:"MessageUUID"`
		} `json:"To"`
	} `json:"Messages"`
}

func (c *MailjetClient) SendOTP(ctx context.Context, to, code, purpose string) (string, error) {
	subject, text := otpCopy(code, purpose)
	payload := map[string]any{
		"Messages": []any{map[string]any{
			"From":     map[string]string{"Email": c.fromEmail, "Name": c.fromName},
			"To":       []map[string]string{{"Email": to}},
			"Subject":  subject,
			"TextPart": text,
			"HTMLPart": fmt.Sprintf(`<p>%s</p><p style="font-size:28px;letter-spacing:6px"><b>%s</b></p><p>Jangan bagikan kode ini kepada siapa pun. Jika Anda tidak meminta kode ini, abaikan email tersebut.</p>`, text, code),
		}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://api.mailjet.com/v3.1/send", bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	auth := base64.StdEncoding.EncodeToString([]byte(c.apiKey + ":" + c.secret))
	req.Header.Set("Authorization", "Basic "+auth)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("mailjet: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("mailjet: status %d", resp.StatusCode)
	}
	var out mjResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		return "", fmt.Errorf("mailjet: respons tidak terbaca: %w", err)
	}
	if len(out.Messages) == 0 || len(out.Messages[0].To) == 0 {
		return "", fmt.Errorf("mailjet: respons kosong")
	}
	if !strings.EqualFold(out.Messages[0].Status, "success") {
		return "", fmt.Errorf("mailjet: status %s", out.Messages[0].Status)
	}
	return fmt.Sprintf("%d", out.Messages[0].To[0].MessageID), nil
}

func otpCopy(code, purpose string) (subject, text string) {
	switch purpose {
	case "register":
		subject = "Kode verifikasi pendaftaran Kantin Kampus"
		text = "Gunakan kode berikut untuk menyelesaikan pendaftaran akun Anda:"
	default:
		subject = "Kode verifikasi login Kantin Kampus"
		text = "Gunakan kode berikut untuk menyelesaikan login Anda:"
	}
	return subject, text
}
