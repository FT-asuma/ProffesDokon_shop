import os

def scan_folder(folder_path, output_file="directory_and_content.txt"):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(folder_path):
            # Normalize path parts for matching
            normalized_root = root.replace("\\", "/")

            # Skip unwanted directories by modifying `dirs` in-place
            dirs[:] = [d for d in dirs if os.path.join(root, d).replace("\\", "/") not in (
                os.path.join(folder_path, "node_modules").replace("\\", "/"),
                os.path.join(folder_path, "public/images").replace("\\", "/")
            )]

            outfile.write(f"Directory: {root}\n")

            for file in files:
                file_path = os.path.join(root, file)
                outfile.write(f"  File: {file}\n")
                try:
                    with open(file_path, 'r', encoding='utf-8', errors='ignore') as infile:
                        content = infile.read()
                        outfile.write(f"    Content:\n")
                        for line in content.splitlines():
                            outfile.write(f"      {line}\n")
                except Exception as e:
                    outfile.write(f"    Error reading file: {e}\n")
                outfile.write("-" * 30 + "\n")

            outfile.write("=" * 50 + "\n\n")

if __name__ == "__main__":
    target_folder = input("Enter the path to the folder you want to scan: ")
    scan_folder(target_folder)
    print("Scan complete. Saved to 'directory_and_content.txt'")
