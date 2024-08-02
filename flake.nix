{
  description = "A very basic flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";
      pkgs = nixpkgs.legacyPackages.${system};
    in
    {
      devShells.${system}.default =
        pkgs.mkShell {
          buildInputs = with pkgs; [
	    bun
            stdenv.cc.cc.lib
            fontconfig
          ];

          LD_LIBRARY_PATH = "${nixpkgs.lib.makeLibraryPath (with pkgs; [
            stdenv.cc.cc.lib
            fontconfig
          ])}:$LD_LIBRARY_PATH";
        };
    };
}
