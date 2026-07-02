package tools

import (
	"context"
)

type Request struct {
	URL        string            `json:"url"`
	URLs       []string          `json:"urls,omitempty"`       // bulk tools: multiple video URLs
	Options    map[string]string `json:"options"`
	Timestamps []TimestampRow    `json:"timestamps,omitempty"` // for timestamp generator
}

type TimestampRow struct {
	Time  string `json:"time"`
	Label string `json:"label"`
}

type ToolError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func (e *ToolError) Error() string {
	return e.Message
}

func NewToolError(code, message string) *ToolError {
	return &ToolError{
		Code:    code,
		Message: message,
	}
}

type Tool interface {
	Slug() string
	Validate(req Request) error
	Execute(ctx context.Context, req Request) (any, error)
}

var registry = make(map[string]Tool)

func Register(t Tool) {
	registry[t.Slug()] = t
}

func Get(slug string) (Tool, bool) {
	t, ok := registry[slug]
	return t, ok
}

func All() []Tool {
	var list []Tool
	for _, t := range registry {
		list = append(list, t)
	}
	return list
}
