// Run from a compatible new-api checkout; this file never modifies it.
package main

import (
	"fmt"
	"os"

	"github.com/QuantumNous/new-api/pkg/jsplugin"
)

func main() {
	if len(os.Args) == 3 && os.Args[1] == "supports-new-api" {
		source, err := os.ReadFile(os.Args[2])
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		plugin, err := jsplugin.NewRegistry().Register(string(source), jsplugin.Options{Key: "upstream-check", Version: "check"})
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		if !plugin.Meta.SupportsUpstream(jsplugin.UpstreamKindNewAPI) {
			fmt.Fprintln(os.Stderr, "plugin cannot be bound to a New API channel")
			os.Exit(1)
		}
		fmt.Println("plugin can be bound to a New API channel")
		return
	}
	if len(os.Args) == 3 && os.Args[1] == "icon" {
		data, err := os.ReadFile(os.Args[2])
		if err == nil {
			err = jsplugin.ValidateIconImage("image/svg+xml", data)
		}
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			os.Exit(1)
		}
		fmt.Printf("plugin icon SVG is valid (%d bytes)\n", len(data))
		return
	}
	os.Exit(jsplugin.RunCLI(os.Args[1:], os.Stdout, os.Stderr))
}
